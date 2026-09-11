using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Globalization;
using System.Linq;
using System.Management;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;

namespace D16OwnedE2E {
    public sealed class Identity {
        public int pid;
        public int parentPid;
        public string startTime;
        public string command;
        public string executable;
        public string token;
    }

    // Retained Process objects hold native handles. A reused numeric PID can
    // never redirect Kill() to a different process.
    sealed class Member {
        public Process process;
        public Identity identity;
    }
    sealed class Owner {
        public SafeFileHandle job;
        public Dictionary<int, Member> members = new Dictionary<int, Member>();
    }

    public sealed class Supervisor : IDisposable {
        readonly Dictionary<string, Owner> owners = new Dictionary<string, Owner>();
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        static extern SafeFileHandle CreateJobObject(IntPtr attributes, string name);
        [DllImport("kernel32.dll", SetLastError = true)]
        static extern bool AssignProcessToJobObject(SafeFileHandle job, IntPtr process);
        [DllImport("kernel32.dll", SetLastError = true)]
        static extern bool IsProcessInJob(IntPtr process, SafeFileHandle job, out bool result);
        [DllImport("kernel32.dll", SetLastError = true)]
        static extern bool QueryInformationJobObject(SafeFileHandle job, int infoClass, IntPtr buffer, uint length, IntPtr returned);
        [DllImport("iphlpapi.dll", SetLastError = true)]
        static extern uint GetExtendedTcpTable(IntPtr table, ref int length, bool sorted, int family, int tableClass, uint reserved);

        static Exception NativeError(string message) {
            return new InvalidOperationException(message + ": " + new Win32Exception(Marshal.GetLastWin32Error()).Message);
        }
        static bool Equal(Identity expected, Identity actual) {
            return expected.pid == actual.pid && expected.parentPid == actual.parentPid
                && expected.startTime == actual.startTime && expected.command == actual.command
                && expected.executable == actual.executable && expected.token == actual.token;
        }
        static Identity Capture(Process process, string token) {
            // Opening/retaining the handle precedes every PID-based WMI read.
            IntPtr handle = process.Handle;
            if (process.HasExited) return null;
            try { using (var info = new ManagementObject("Win32_Process.Handle='" + process.Id + "'")) {
                info.Get();
                var identity = new Identity {
                    pid = process.Id,
                    parentPid = Convert.ToInt32(info["ParentProcessId"], CultureInfo.InvariantCulture),
                    startTime = process.StartTime.ToUniversalTime().Ticks.ToString(CultureInfo.InvariantCulture),
                    command = (string)info["CommandLine"],
                    executable = process.MainModule.FileName,
                    token = token
                };
                if (process.HasExited) return null;
                if (String.IsNullOrEmpty(identity.command) || String.IsNullOrEmpty(identity.executable))
                    throw new InvalidOperationException("Unreadable process identity; ownership retained");
                return identity;
            } } catch {
                // A sibling may exit naturally while another member is being
                // stopped. WMI removal can precede the process-handle signal.
                // Only that same held handle's confirmed exit permits omission.
                if (process.WaitForExit(250)) return null;
                throw;
            }
        }
        static int[] JobPids(Owner owner) {
            int capacity = 64;
            while (capacity <= 65536) {
                int size = 8 + IntPtr.Size * capacity;
                IntPtr buffer = Marshal.AllocHGlobal(size);
                try {
                    if (!QueryInformationJobObject(owner.job, 3, buffer, (uint)size, IntPtr.Zero)) {
                        if (Marshal.GetLastWin32Error() == 234) { capacity *= 2; continue; }
                        throw NativeError("Cannot enumerate owned process tree");
                    }
                    int count = Marshal.ReadInt32(buffer, 4);
                    var result = new int[count];
                    for (int index = 0; index < count; index++) result[index] = checked((int)Marshal.ReadIntPtr(buffer, 8 + index * IntPtr.Size));
                    return result;
                } finally { Marshal.FreeHGlobal(buffer); }
            }
            throw new InvalidOperationException("Owned process tree exceeded safe snapshot limit");
        }
        static void Validate(Owner owner, Member member, string token) {
            if (member.process.HasExited) return;
            bool inJob;
            if (!IsProcessInJob(member.process.Handle, owner.job, out inJob) || !inJob)
                throw new InvalidOperationException("Process Job ownership mismatch; process and lease retained");
            Identity actual = Capture(member.process, token);
            if (actual != null && !Equal(member.identity, actual))
                throw new InvalidOperationException("Process identity mismatch; process and lease retained");
        }
        public Identity Attach(int pid, string token, string gate, string executable) {
            if (owners.ContainsKey(token) || token.Length != 64 || token.Any(c => !Uri.IsHexDigit(c)))
                throw new InvalidOperationException("Invalid or duplicate process owner token");
            Process process = Process.GetProcessById(pid);
            try {
                Identity identity = Capture(process, token);
                if (identity == null || !identity.command.Contains(gate) || !identity.command.Contains(token)
                    || !String.Equals(identity.executable, executable, StringComparison.OrdinalIgnoreCase))
                    throw new InvalidOperationException("Gated child identity mismatch");
                var owner = new Owner {job = CreateJobObject(IntPtr.Zero, null)};
                if (owner.job.IsInvalid) throw NativeError("Cannot create owned process Job");
                // No BREAKAWAY_OK or KILL_ON_JOB_CLOSE: children cannot escape,
                // and uncertainty never causes an implicit termination.
                if (!AssignProcessToJobObject(owner.job, process.Handle)) {
                    owner.job.Dispose();
                    throw NativeError("Cannot attach gated child to owned process Job");
                }
                owner.members.Add(pid, new Member {process = process, identity = identity});
                owners.Add(token, owner);
                return identity;
            } catch { process.Dispose(); throw; }
        }
        public Identity[] Snapshot(string token) {
            Owner owner = owners[token];
            foreach (int pid in JobPids(owner)) {
                Member member;
                if (owner.members.TryGetValue(pid, out member)) { Validate(owner, member, token); continue; }
                Process process;
                try { process = Process.GetProcessById(pid); }
                catch (ArgumentException) { continue; } // Already ended, not an unknown live owner.
                try {
                    bool inJob;
                    IntPtr handle = process.Handle;
                    if (process.HasExited) { process.Dispose(); continue; }
                    if (!IsProcessInJob(handle, owner.job, out inJob) || !inJob)
                        throw new InvalidOperationException("Snapshot process left its owned Job");
                    Identity identity = Capture(process, token);
                    if (identity == null) { process.Dispose(); continue; }
                    owner.members.Add(pid, new Member {process = process, identity = identity});
                } catch { process.Dispose(); throw; }
            }
            return owner.members.Values.Where(member => !member.process.HasExited).Select(member => member.identity).ToArray();
        }
        int Depth(Owner owner, Identity identity) {
            int depth = 0;
            Member parent;
            var visited = new HashSet<int>();
            while (visited.Add(identity.pid) && owner.members.TryGetValue(identity.parentPid, out parent)) {
                depth++;
                identity = parent.identity;
            }
            return depth;
        }
        public void Stop(string token, Identity[] expected) {
            Owner owner = owners[token];
            // Preflight every supplied identity before terminating any member.
            foreach (Identity identity in expected) {
                Member member;
                if (!owner.members.TryGetValue(identity.pid, out member) || !Equal(identity, member.identity))
                    throw new InvalidOperationException("Process identity mismatch; process and lease retained");
                Validate(owner, member, token);
            }
            for (int attempt = 0; attempt < 5; attempt++) {
                Identity[] current = Snapshot(token);
                if (current.Length == 0 && JobPids(owner).Length == 0) return;
                foreach (Identity identity in current.OrderByDescending(item => Depth(owner, item))) {
                    Member member = owner.members[identity.pid];
                    Validate(owner, member, token); // Immediately before handle-based termination.
                    if (member.process.HasExited) continue;
                    member.process.Kill();
                    if (!member.process.WaitForExit(5000))
                        throw new InvalidOperationException("Owned process did not stop; lease retained");
                }
                System.Threading.Thread.Sleep(20);
            }
            if (JobPids(owner).Length != 0) throw new InvalidOperationException("Owned descendants remain; lease retained");
        }
        public static int[] ListenerOwners(int port) {
            var pids = new HashSet<int>();
            foreach (int family in new[] {2, 23}) {
                int length = 0;
                uint result = GetExtendedTcpTable(IntPtr.Zero, ref length, false, family, 3, 0);
                if (result != 122 && result != 0) throw new InvalidOperationException("Cannot size TCP ownership table: " + result);
                IntPtr buffer = Marshal.AllocHGlobal(length);
                try {
                    result = GetExtendedTcpTable(buffer, ref length, false, family, 3, 0);
                    if (result != 0) throw new InvalidOperationException("Cannot inspect TCP ownership table: " + result);
                    int count = Marshal.ReadInt32(buffer);
                    int rowSize = family == 2 ? 24 : 56;
                    int portOffset = family == 2 ? 8 : 20;
                    int pidOffset = family == 2 ? 20 : 52;
                    for (int index = 0; index < count; index++) {
                        int offset = 4 + index * rowSize;
                        int localPort = Marshal.ReadByte(buffer, offset + portOffset) * 256 + Marshal.ReadByte(buffer, offset + portOffset + 1);
                        if (localPort == port) pids.Add(Marshal.ReadInt32(buffer, offset + pidOffset));
                    }
                } finally { Marshal.FreeHGlobal(buffer); }
            }
            return pids.ToArray();
        }
        public void Dispose() {
            foreach (Owner owner in owners.Values) {
                foreach (Member member in owner.members.Values) member.process.Dispose();
                owner.job.Dispose();
            }
            owners.Clear();
        }
    }
}

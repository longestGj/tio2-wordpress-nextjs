# Installed policy: new surfaces require reviewed hashes, never caller counts.
function Get-ReleaseCoverageCounts([string] $SurfaceSha256) {
    switch -CaseSensitive ($SurfaceSha256) {
        '42b29755e99dec1ec71fe07a98a7cf586349cf60bfb25f7f90d74ca6f35bd152' {
            return [ordered]@{businessPages=56;registeredObjects=58;widths=3;browserCases=174}
        }
        '6655c74b695b0f0f4d0f9ac94607ba138bf1d42b063e2d5daa101d2953c19cad' {
            return [ordered]@{businessPages=57;registeredObjects=59;widths=3;browserCases=177}
        }
        default { throw 'Release surface is not installed in the coverage policy.' }
    }
}

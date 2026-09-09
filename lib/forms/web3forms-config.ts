import contract from './web3forms-contract.json'

// Web3Forms documents an Access Key/Form ID as a UUID. Syntax only: no
// version/variant or account binding claim. PowerShell consumes this same pattern.
const accessKeyPattern = new RegExp(contract.accessKeyPattern, 'u')

export function isWeb3FormsAccessKey(value: unknown): value is string {
  return typeof value === 'string' && accessKeyPattern.test(value)
}

#!/usr/bin/env tsx
/**
 * Pre-Production Verification Suite
 * 
 * Comprehensive checks before deploying data scoping fixes to production.
 * This script verifies all critical functionality is working correctly.
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

interface CheckResult {
  name: string
  passed: boolean
  message: string
  critical: boolean
}

const results: CheckResult[] = []

function check(name: string, passed: boolean, message: string, critical = true) {
  results.push({ name, passed, message, critical })
  const icon = passed ? '✅' : (critical ? '❌' : '⚠️')
  console.log(`${icon} ${name}: ${message}`)
}

function runCommand(command: string): { success: boolean; output: string } {
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' })
    return { success: true, output }
  } catch (error: any) {
    return { success: false, output: error.message }
  }
}

console.log('🔍 Pre-Production Verification Suite')
console.log('=' .repeat(60))
console.log('')

// Check 1: Git status
console.log('📦 Git Repository Checks...')
const gitStatus = runCommand('git status --porcelain')
check(
  'Working tree clean',
  gitStatus.output.trim() === '',
  gitStatus.output.trim() === '' ? 'No uncommitted changes' : 'Has uncommitted changes'
)

const currentBranch = runCommand('git branch --show-current')
check(
  'On develop branch',
  currentBranch.output.trim() === 'develop',
  `Current branch: ${currentBranch.output.trim()}`
)
console.log('')

// Check 2: File existence
console.log('📁 File Integrity Checks...')
const criticalFiles = [
  'src/lib/data/property-service.ts',
  'src/lib/data/tenant-service.ts',
  'src/hooks/use-tenants.ts',
  'src/hooks/use-expenses.ts',
]

criticalFiles.forEach(file => {
  const exists = fs.existsSync(file)
  check(`File exists: ${file}`, exists, exists ? 'Found' : 'Missing')
})
console.log('')

// Check 3: Code quality
console.log('🔧 Code Quality Checks...')

const typeCheck = runCommand('npx tsc --noEmit')
check(
  'TypeScript compilation',
  typeCheck.success,
  typeCheck.success ? 'No type errors' : 'Type errors found'
)

const unitTests = runCommand('npm run test:unit')
check(
  'Unit tests',
  unitTests.success,
  unitTests.success ? 'All tests passing' : 'Some tests failing'
)

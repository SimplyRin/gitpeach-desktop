/* eslint-disable no-sync */

import * as path from 'path'
import * as cp from 'child_process'
import { promisify } from 'util'

import glob = require('glob')
const globPromise = promisify(glob)

import { getDistPath, getDistRoot } from './dist-info'

export async function packageElectronBuilder(): Promise<Array<string>> {
  const distPath = getDistPath()
  const distRoot = getDistRoot()

  console.log('Building all Linux packages with electron-builder...')
  console.log(`Using distribution path: ${distPath}`)
  console.log(`Using distribution root: ${distRoot}`)

  // Verify the distribution path exists
  if (!require('fs').existsSync(distPath)) {
    throw new Error(`Distribution path ${distPath} does not exist. Please run the build step first.`)
  }

  // List contents of distribution path for debugging
  console.log(`Contents of ${distPath}:`)
  try {
    const fs = require('fs')
    const contents = fs.readdirSync(distPath)
    contents.forEach((item: string) => console.log(`  - ${item}`))
  } catch (err) {
    console.log('Could not list distribution path contents:', err)
  }

  // Define all target combinations
  const targets = [
    { arch: '--x64', target: 'deb' },
    { arch: '--x64', target: 'rpm' },
  ]

  // Try multiple approaches to find electron-builder - prioritize direct node execution
  const electronBuilderPath = path.resolve(
    __dirname,
    '..',
    'node_modules',
    '.bin',
    'electron-builder'
  )

  // Use node directly to avoid dependency resolution issues
  let electronBuilder = 'node'
  let baseArgs = [electronBuilderPath]

  // Check if the binary exists, if not try alternative approaches
  if (!require('fs').existsSync(electronBuilderPath)) {
    console.log(
      'electron-builder binary not found at expected path, trying alternatives...'
    )
    
    // Try yarn as fallback
    electronBuilder = 'yarn'
    baseArgs = ['run', 'electron-builder']
  }

  const configPath = path.resolve(__dirname, 'electron-builder-linux.yml')
  let hasError = false

  // Build each target combination
  for (const { arch, target } of targets) {
    console.log(
      `Building ${target} for ${arch.replace('--', '')} architecture...`
    )

    const args =
      electronBuilder === 'yarn'
        ? [
            'run',
            'electron-builder',
            'build',
            '--prepackaged',
            distPath,
            arch,
            '--linux',
            target,
            '--config',
            configPath,
          ]
        : [
            ...baseArgs,
            'build',
            '--prepackaged',
            distPath,
            arch,
            '--linux',
            target,
            '--config',
            configPath,
          ]

    const { error, status, stderr, stdout } = cp.spawnSync(electronBuilder, args, { 
      stdio: 'inherit',
      encoding: 'utf8'
    })

    if (error != null || status !== 0) {
      console.error(
        `Failed to build ${target} for ${arch.replace('--', '')}: ${
          error?.message || `Exit code: ${status}`
        }`
      )
      if (stderr) console.error('stderr:', stderr)
      if (stdout) console.log('stdout:', stdout)
      hasError = true
    }
  }

  if (hasError) {
    console.log(
      'Some builds failed, but continuing to check for generated packages...'
    )
  }

  // Find all generated packages (deb, rpm) for all architectures
  const patterns = [
    `${distRoot}/rin-gitpeach-desktop-*.deb`,
    `${distRoot}/rin-gitpeach-desktop-*.rpm`,
    `${distRoot}/GitPeachDesktop-*.deb`,
    `${distRoot}/GitPeachDesktop-*.rpm`,
    `${distRoot}/GitHubDesktop-*.deb`,
    `${distRoot}/GitHubDesktop-*.rpm`,
  ]

  let allFiles: string[] = []

  for (const pattern of patterns) {
    try {
      const files = await globPromise(pattern)
      allFiles = allFiles.concat(files)
      console.log(`Found ${files.length} files matching pattern: ${pattern}`)
      files.forEach(file => console.log(`  - ${file}`))
    } catch (error) {
      console.log(`No files found for pattern: ${pattern}`)
    }
  }

  if (allFiles.length === 0) {
    console.log(`No packages found in ${distRoot}, listing directory contents:`)
    try {
      const fs = require('fs')
      const contents = fs.readdirSync(distRoot)
      console.log('Directory contents:', contents)
    } catch (err) {
      console.log('Could not list directory contents:', err)
    }

    return Promise.reject(
      `Expected at least one package installer but found none in ${distRoot} - exiting...`
    )
  }

  console.log(`Successfully found ${allFiles.length} package(s):`)
  allFiles.forEach(file => console.log(`  - ${file}`))

  return Promise.resolve(allFiles)
}

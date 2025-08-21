/* eslint-disable no-sync */

import * as path from 'path'
import * as cp from 'child_process'
import { promisify } from 'util'

import glob = require('glob')
const globPromise = promisify(glob)

import { getDistPath, getDistRoot } from './dist-info'

function getArchitecture() {
  const arch = process.env.npm_config_arch || process.arch
  switch (arch) {
    case 'arm64':
      return '--arm64'
    case 'arm':
      return '--armv7l'
    default:
      return '--x64'
  }
}

export async function packageElectronBuilder(): Promise<Array<string>> {
  const distPath = getDistPath()
  const distRoot = getDistRoot()

  // Try multiple approaches to find electron-builder
  let electronBuilder = path.resolve(
    __dirname,
    '..',
    'node_modules',
    '.bin',
    'electron-builder'
  )

  // Check if the binary exists, if not try alternatives
  if (!require('fs').existsSync(electronBuilder)) {
    console.log(
      'electron-builder binary not found at expected path, trying alternatives...'
    )

    // Try npx approach
    electronBuilder = 'npx'

    const configPath = path.resolve(__dirname, 'electron-builder-linux.yml')

    const args = [
      'electron-builder',
      'build',
      '--prepackaged',
      distPath,
      getArchitecture(),
      '--config',
      configPath,
    ]

    const { error } = cp.spawnSync(electronBuilder, args, { stdio: 'inherit' })

    if (error != null) {
      console.log(
        'npx electron-builder failed, trying direct electron-builder...'
      )

      // Final fallback: try running electron-builder directly
      const directArgs = [
        'build',
        '--prepackaged',
        distPath,
        getArchitecture(),
        '--config',
        configPath,
      ]

      const { error: directError } = cp.spawnSync(
        'electron-builder',
        directArgs,
        { stdio: 'inherit' }
      )

      if (directError != null) {
        return Promise.reject(directError)
      }
    }
  } else {
    // Original approach when binary exists
    const configPath = path.resolve(__dirname, 'electron-builder-linux.yml')

    const args = [
      'build',
      '--prepackaged',
      distPath,
      getArchitecture(),
      '--config',
      configPath,
    ]

    const { error } = cp.spawnSync(electronBuilder, args, { stdio: 'inherit' })

    if (error != null) {
      return Promise.reject(error)
    }
  }

  // Find all generated packages (AppImage, deb, rpm) for all architectures
  const patterns = [
    `${distRoot}/GitHubDesktop-linux-*.AppImage`,
    `${distRoot}/GitHubDesktop-*.deb`,
    `${distRoot}/GitHubDesktop-*.rpm`
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

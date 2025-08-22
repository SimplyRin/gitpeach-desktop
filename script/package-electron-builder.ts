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

  // Build for both x64 and arm64 architectures
  const architectures = ['--x64', '--arm64']
  const targets = ['AppImage', 'deb', 'rpm']

  // Try multiple approaches to find electron-builder
  let electronBuilder = path.resolve(
    __dirname,
    '..',
    'node_modules',
    '.bin',
    'electron-builder'
  )

  const configPath = path.resolve(__dirname, 'electron-builder-linux.yml')

  // Check if the binary exists, if not try alternatives
  if (!require('fs').existsSync(electronBuilder)) {
    console.log(
      'electron-builder binary not found at expected path, trying npx...'
    )
    electronBuilder = 'npx'
  }

  console.log('Building packages for all architectures and targets...')

  // Build each combination of target and architecture
  for (const target of targets) {
    for (const arch of architectures) {
      console.log(`Building ${target} for ${arch}...`)

      const args =
        electronBuilder === 'npx'
          ? [
              'electron-builder',
              '--linux',
              target,
              arch,
              '--prepackaged',
              distPath,
              '--config',
              configPath,
              '--publish=never',
            ]
          : [
              '--linux',
              target,
              arch,
              '--prepackaged',
              distPath,
              '--config',
              configPath,
              '--publish=never',
            ]

      try {
        const { error, status } = cp.spawnSync(electronBuilder, args, {
          stdio: 'inherit',
          timeout: 300000, // 5 minute timeout per build
        })

        if (error) {
          console.log(`Error building ${target} ${arch}:`, error.message)
        } else if (status !== 0) {
          console.log(
            `Build failed for ${target} ${arch} with exit code: ${status}`
          )
        } else {
          console.log(`Successfully built ${target} ${arch}`)
        }
      } catch (buildError) {
        console.log(`Exception during ${target} ${arch} build:`, buildError)
      }
    }
  }

  console.log('Completed building all targets and architectures')

  // Find all generated packages (AppImage, deb, rpm) for all architectures
  const patterns = [
    `${distRoot}/GitHubDesktop-linux-*.AppImage`,
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

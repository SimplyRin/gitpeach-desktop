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

  const appImageInstaller = `${distRoot}/GitHubDesktop-linux-*.AppImage`

  const files = await globPromise(appImageInstaller)
  if (files.length !== 1) {
    return Promise.reject(
      `Expected one AppImage installer but instead found '${files.join(
        ', '
      )}' - exiting...`
    )
  }

  const appImageInstallerPath = files[0]

  return Promise.resolve([appImageInstallerPath])
}

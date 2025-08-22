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

  // Rename files to ensure consistent architecture naming (aarch64 -> arm64)
  const renamedFiles: string[] = []
  const fs = require('fs')
  
  for (const file of allFiles) {
    let newFileName = file
    
    // Replace aarch64 with arm64 in filename for consistency
    if (file.includes('aarch64')) {
      newFileName = file.replace(/aarch64/g, 'arm64')
      console.log(`Renaming ${file} to ${newFileName}`)
      
      try {
        fs.renameSync(file, newFileName)
        renamedFiles.push(newFileName)
      } catch (error) {
        console.log(`Failed to rename ${file}: ${error}`)
        renamedFiles.push(file) // Keep original if rename fails
      }
    } else {
      renamedFiles.push(file)
    }
  }

  // Fix libz.so issues in ARM64 AppImages
  await fixLibzInAppImages(renamedFiles)

  return Promise.resolve(renamedFiles)
}

async function fixLibzInAppImages(files: string[]): Promise<void> {
  const fs = require('fs')
  const path = require('path')
  
  for (const file of files) {
    if (file.endsWith('.AppImage') && file.includes('arm64')) {
      console.log(`Fixing libz.so for ARM64 AppImage: ${file}`)
      
      try {
        // Extract AppImage
        const { spawn } = require('child_process')
        const extractProcess = spawn(file, ['--appimage-extract'], {
          stdio: 'pipe',
          cwd: path.dirname(file)
        })
        
        await new Promise((resolve, reject) => {
          extractProcess.on('close', (code: number) => {
            if (code === 0) {
              resolve(undefined)
            } else {
              reject(new Error(`AppImage extraction failed with code ${code}`))
            }
          })
        })
        
        const extractedDir = path.join(path.dirname(file), 'squashfs-root')
        
        if (fs.existsSync(extractedDir)) {
          // Copy ARM64 libz.so if it exists
          const arm64LibDir = '/usr/lib/aarch64-linux-gnu'
          const libzSourcePath = path.join(arm64LibDir, 'libz.so.1')
          const libzDestPath = path.join(extractedDir, 'usr', 'lib', 'libz.so.1')
          
          if (fs.existsSync(libzSourcePath)) {
            // Create lib directory if it doesn't exist
            const libDir = path.dirname(libzDestPath)
            if (!fs.existsSync(libDir)) {
              fs.mkdirSync(libDir, { recursive: true })
            }
            
            console.log(`Copying libz.so.1 from ${libzSourcePath} to ${libzDestPath}`)
            fs.copyFileSync(libzSourcePath, libzDestPath)
            
            // Create symlink for libz.so
            const libzSymlinkPath = path.join(extractedDir, 'usr', 'lib', 'libz.so')
            if (!fs.existsSync(libzSymlinkPath)) {
              fs.symlinkSync('./libz.so.1', libzSymlinkPath)
            }
          }
          
          // Clean up extracted directory
          const rimraf = require('rimraf')
          rimraf.sync(extractedDir)
        }
      } catch (error) {
        console.log(`Failed to fix libz.so for ${file}: ${error}`)
      }
    }
  }
}

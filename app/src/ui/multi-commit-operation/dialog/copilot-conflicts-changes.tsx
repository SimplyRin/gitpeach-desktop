import * as React from 'react'
import * as Path from 'path'
import { CommittedFileChange } from '../../../models/status'
import {
  DiffType,
  ITextDiff,
  ImageDiffType,
  DiffHunkExpansionType,
} from '../../../models/diff'
import { DiffHunk, DiffHunkHeader } from '../../../models/diff/raw-diff'
import { DiffLine, DiffLineType } from '../../../models/diff/diff-line'
import { WorkingDirectoryFileChange } from '../../../models/status'
import { IFileResolution } from '../../../lib/copilot-conflict-resolution'
import { FileList } from '../../history/file-list'
import { Diff } from '../../diff'
import { DiffOptions } from '../../diff/diff-options'
import { Repository } from '../../../models/repository'
import { Dispatcher } from '../../dispatcher'
import { openFile } from '../../lib/open-file'

interface ICopilotConflictsChangesProps {
  readonly repository: Repository
  readonly dispatcher: Dispatcher
  readonly conflictedFiles: ReadonlyArray<WorkingDirectoryFileChange>
  readonly copilotResolutions: ReadonlyArray<IFileResolution> | null
}

interface ICopilotConflictsChangesState {
  readonly selectedFile: CommittedFileChange | null
  readonly showSideBySideDiff: boolean
  readonly hideWhitespaceInDiff: boolean
  readonly imageDiffType: ImageDiffType
}

/**
 * The Changes tab in the Copilot conflicts dialog, showing a file list
 * alongside a diff preview of Copilot's conflict resolutions.
 *
 * Uses the same FileList + Diff pattern as PullRequestFilesChanged.
 */
export class CopilotConflictsChanges extends React.Component<
  ICopilotConflictsChangesProps,
  ICopilotConflictsChangesState
> {
  public constructor(props: ICopilotConflictsChangesProps) {
    super(props)

    const files = this.getCommittedFiles()
    this.state = {
      selectedFile: files.length > 0 ? files[0] : null,
      showSideBySideDiff: false,
      hideWhitespaceInDiff: false,
      imageDiffType: ImageDiffType.TwoUp,
    }
  }

  /**
   * Convert WorkingDirectoryFileChange to CommittedFileChange for use
   * with the standard FileList component.
   */
  private getCommittedFiles(): ReadonlyArray<CommittedFileChange> {
    return this.props.conflictedFiles.map(
      f => new CommittedFileChange(f.path, f.status, 'HEAD', 'HEAD^')
    )
  }

  private getDiffForFile(file: CommittedFileChange): ITextDiff | null {
    const resolution = this.props.copilotResolutions?.find(
      r => r.path === file.path
    )

    if (resolution === undefined) {
      return null
    }

    return createMockDiff(file.path)
  }

  private onSelectedFileChanged = (file: CommittedFileChange) => {
    this.setState({ selectedFile: file })
  }

  private onShowSideBySideDiffChanged = (showSideBySideDiff: boolean) => {
    this.setState({ showSideBySideDiff })
  }

  private onHideWhitespaceInDiffChanged = (hideWhitespaceInDiff: boolean) => {
    this.setState({ hideWhitespaceInDiff })
  }

  private onDiffOptionsOpened = () => {
    this.props.dispatcher.incrementMetric('diffOptionsViewedCount')
  }

  private onOpenBinaryFile = (fullPath: string) => {
    openFile(fullPath, this.props.dispatcher)
  }

  private onChangeImageDiffType = (imageDiffType: ImageDiffType) => {
    this.setState({ imageDiffType })
  }

  private onRowDoubleClick = (row: number) => {
    const file = this.getCommittedFiles()[row]
    if (file !== undefined) {
      const fullPath = Path.join(this.props.repository.path, file.path)
      openFile(fullPath, this.props.dispatcher)
    }
  }

  public render() {
    const files = this.getCommittedFiles()
    const { selectedFile, showSideBySideDiff, hideWhitespaceInDiff } =
      this.state

    const diff =
      selectedFile !== null ? this.getDiffForFile(selectedFile) : null

    return (
      <div className="copilot-changes-tab">
        <div className="copilot-changes-header">
          <DiffOptions
            isInteractiveDiff={false}
            hideWhitespaceChanges={hideWhitespaceInDiff}
            onHideWhitespaceChangesChanged={this.onHideWhitespaceInDiffChanged}
            showSideBySideDiff={showSideBySideDiff}
            onShowSideBySideDiffChanged={this.onShowSideBySideDiffChanged}
            onDiffOptionsOpened={this.onDiffOptionsOpened}
          />
        </div>
        <div className="copilot-changes-content">
          <div className="copilot-changes-file-list">
            <FileList
              files={files}
              onSelectedFileChanged={this.onSelectedFileChanged}
              selectedFile={selectedFile}
              availableWidth={200}
              onRowDoubleClick={this.onRowDoubleClick}
            />
          </div>
          {selectedFile !== null && diff !== null && (
            <Diff
              repository={this.props.repository}
              readOnly={true}
              file={selectedFile}
              diff={diff}
              fileContents={null}
              imageDiffType={this.state.imageDiffType}
              hideWhitespaceInDiff={hideWhitespaceInDiff}
              showSideBySideDiff={showSideBySideDiff}
              showDiffCheckMarks={false}
              onOpenBinaryFile={this.onOpenBinaryFile}
              onChangeImageDiffType={this.onChangeImageDiffType}
              onHideWhitespaceInDiffChanged={this.onHideWhitespaceInDiffChanged}
            />
          )}
          {selectedFile !== null && diff === null && (
            <div className="copilot-changes-no-diff">
              Diff preview is only available for files resolved by Copilot.
            </div>
          )}
        </div>
      </div>
    )
  }
}

// TODO: Remove — temporary mock diff for layout validation only
function createMockDiff(_path: string): ITextDiff {
  // prettier-ignore
  const raw = [
    ' import { Repository } from "../models/repository"',
    ' ',
    ' export function getConflictedFiles(',
    '-<<<<<<< HEAD',
    '-  repository: Repository,',
    '-  includeResolved: boolean',
    '-=======',
    '-  repository: Repository',
    '->>>>>>> feature-branch',
    '+  repository: Repository,',
    '+  includeResolved: boolean = false',
    ' ): ReadonlyArray<string> {',
    '   return []',
    ' }',
  ]

  let oldLine = 1
  let newLine = 1
  const diffLines: DiffLine[] = raw.map((text, i) => {
    const type =
      text[0] === '+'
        ? DiffLineType.Add
        : text[0] === '-'
        ? DiffLineType.Delete
        : DiffLineType.Context
    const oLine = type !== DiffLineType.Add ? oldLine++ : null
    const nLine = type !== DiffLineType.Delete ? newLine++ : null
    return new DiffLine(text, type, i + 1, oLine, nLine)
  })

  const header = new DiffHunkHeader(1, oldLine - 1, 1, newLine - 1)
  diffLines.unshift(
    new DiffLine(
      header.toDiffLineRepresentation(),
      DiffLineType.Hunk,
      0,
      null,
      null
    )
  )

  const hunk = new DiffHunk(
    header,
    diffLines,
    0,
    diffLines.length - 1,
    DiffHunkExpansionType.None
  )
  return {
    kind: DiffType.Text,
    text: diffLines.map(l => l.text).join('\n'),
    hunks: [hunk],
    maxLineNumber: diffLines.length,
    hasHiddenBidiChars: false,
  }
}

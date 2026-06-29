import assert from 'node:assert'
import { describe, it } from 'node:test'
import * as React from 'react'

import { SideBySideDiffRow } from '../../../src/ui/diff/side-by-side-diff-row'
import { DiffColumn, DiffRowType } from '../../../src/ui/diff/diff-helpers'
import { fireEvent, render, screen } from '../../helpers/ui/render'

describe('SideBySideDiffRow', () => {
  it('ignores middle-button mousedown events on line gutters', () => {
    const startedSelections: Array<{
      readonly row: number
      readonly column: DiffColumn
      readonly select: boolean
    }> = []

    render(
      <SideBySideDiffRow
        row={{
          type: DiffRowType.Added,
          hunkStartLine: 1,
          data: {
            content: 'added line',
            lineNumber: 10,
            diffLineNumber: 1,
            noNewLineIndicator: false,
            isSelected: false,
            tokens: [],
          },
        }}
        isDiffSelectable={true}
        showSideBySideDiff={false}
        hideWhitespaceInDiff={false}
        lineNumberWidth={3}
        numRow={0}
        onStartSelection={(row, column, select) => {
          startedSelections.push({ row, column, select })
        }}
        onMouseEnterHunk={() => {}}
        onMouseLeaveHunk={() => {}}
        onExpandHunk={() => {}}
        onClickHunk={() => {}}
        onContextMenuLine={() => {}}
        onLineNumberCheckedChanged={() => {}}
        onContextMenuHunk={() => {}}
        onContextMenuExpandHunk={() => {}}
        beforeClassNames={[]}
        afterClassNames={[]}
        onHideWhitespaceInDiffChanged={() => {}}
        onHunkExpansionRef={() => {}}
        showDiffCheckMarks={false}
        rowSelectableGroup={null}
      />
    )

    const lineNumber = screen.getByText('10')
    const lineNumberGutter = lineNumber.closest('.line-number')

    assert.ok(lineNumberGutter)

    fireEvent.mouseDown(lineNumberGutter, { button: 1, buttons: 4 })

    assert.deepEqual(startedSelections, [])
  })
})

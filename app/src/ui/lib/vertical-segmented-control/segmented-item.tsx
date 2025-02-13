import classNames from 'classnames'
import * as React from 'react'

interface ISegmentedItemProps {
  /**
   * An id for the item, used to assist in accessibility
   */
  // readonly id: string

  // /**
  //  * An optional id for the parent element, used as `name` for the radio
  //  * input. This is used to ensure that only one item in the group can be
  //  * selected at a time.
  //  */
  // readonly parentId?: string

  // /**
  //  * The value of the item among the other choices in the segmented
  //  * control. This is passed along to the onClick handler to differentiate
  //  * between clicked items.
  //  */
  // readonly value: T

  /**
   * The title for the segmented item. This should be kept short.
   */
  readonly title: string

  /**
   * An optional description which explains the consequences of
   * selecting this item.
   */
  readonly description?: string | JSX.Element

  /**
   * Whether or not the item is currently the active selection among the
   * other choices in the segmented control.
   */
  readonly isSelected: boolean

  /**
   * A function that's called when a user double-clicks on the item
   * using a pointer device.
   */
  // readonly onDoubleClick: (value: T) => void

  // /**
  //  * A function that's called when a user selects the item using a
  //  * keyboard.
  //  */
  // readonly onSelected: (value: T) => void
}

export class SegmentedItem extends React.Component<ISegmentedItemProps, {}> {
  // private onDoubleClick = () => {
  //   this.props.onDoubleClick(this.props.value)
  // }

  public render() {
    const description = this.props.description ? (
      <p>{this.props.description}</p>
    ) : undefined

    const isSelected = this.props.isSelected

    return (
      <div className={classNames('segmented-item', { selected: isSelected })}>
        <div className="title">{this.props.title}</div>
        {description}
      </div>
    )
  }

  // private onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   if (e.target.checked) {
  //     this.props.onSelected(this.props.value)
  //   }
  // }
}

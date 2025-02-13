import * as React from 'react'
import { createUniqueId, releaseUniqueId } from '../id-pool'
import { SegmentedItem } from './segmented-item'
import { RadioGroup } from '../radio-group'

type Key = string | number

/**
 * An item which is rendered as a choice in the segmented control.
 */
export interface ISegmentedItem<T extends Key> {
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
   * The key to use for that item. This key will be passed as
   * the first argument of onSelectionChanged() when the item gets
   * selected.
   *
   * Note that keys should be unique so there can't be two items on
   * the same <VerticalSegmentedControl /> component with the same key.
   */
  readonly key: T
}

interface IVerticalSegmentedControlProps<T extends Key> {
  /**
   * An optional label for the segmented control. Will be rendered
   * as a legend element inside a field group. Consumers are strongly
   * encouraged to use this in order to aid accessibility.
   */
  readonly label?: string

  /**
   * A set of items to be rendered as choices in the segmented control.
   * An item must have a title and may (encouraged) also have a description
   * which explains what the consequences of selecting the items are.
   */
  readonly items: ReadonlyArray<ISegmentedItem<T>>

  /**
   * The currently selected item, denoted by its key.
   */
  readonly selectedKey: T

  /**
   * A function that's called whenever the selected item changes, either
   * as a result of a click using a pointer device or as a result of the user
   * hitting an up/down while the component has focus.
   *
   * The key argument corresponds to the key property of the selected item.
   */
  readonly onSelectionChanged: (key: T) => void
}

interface IVerticalSegmentedControlState {
  /**
   * An automatically generated id for the list element used to reference
   * it from the label element. This is generated once via the id pool when the
   * component is mounted and then released once the component unmounts.
   */
  readonly listId?: string
}

/**
 * A component for presenting a small number of choices to the user. Equivalent
 * of a radio button group but styled as a vertically oriented segmented control.
 */
export class VerticalSegmentedControl<T extends Key> extends React.Component<
  IVerticalSegmentedControlProps<T>,
  IVerticalSegmentedControlState
> {
  public constructor(props: IVerticalSegmentedControlProps<T>) {
    super(props)
    this.state = {}
  }

  private updateListId(label: string | undefined) {
    if (this.state.listId) {
      releaseUniqueId(this.state.listId)
      this.setState({ listId: undefined })
    }

    if (label) {
      this.setState({
        listId: createUniqueId(`VerticalSegmentedControl_${label}`),
      })
    }
  }

  public componentWillMount() {
    this.updateListId(this.props.label)
  }

  public componentWillUnmount() {
    if (this.state.listId) {
      releaseUniqueId(this.state.listId)
    }
  }

  public componentWillReceiveProps(
    nextProps: IVerticalSegmentedControlProps<T>
  ) {
    if (this.props.label !== nextProps.label) {
      this.updateListId(nextProps.label)
    }
  }

  // private onItemDoubleClick = (key: T) => {
  //   // At this point the onSelectionChanged event should've been called already
  //   // with the right key
  //   // this.submitForm()
  // }

  // private onItemSelected = (key: T) => {
  //   if (key !== this.props.selectedKey) {
  //     this.props.onSelectionChanged(key)
  //   }
  // }

  // private getListItemId(index: number) {
  //   return `${this.state.listId}_Item_${index}`
  // }

  private renderItem = (key: T) => {
    const { items, selectedKey } = this.props
    const index = items.findIndex(item => item.key === key)
    const item = items[index]

    return (
      <SegmentedItem
        // id={this.getListItemId(index)}
        // parentId={this.state.listId}
        key={item.key}
        title={item.title}
        description={item.description}
        isSelected={item.key === selectedKey}
        // value={item.key}
        // onDoubleClick={this.onItemDoubleClick}
        // onSelected={this.onItemSelected}
      />
    )
  }

  public render() {
    const { items, label, selectedKey, onSelectionChanged } = this.props
    if (items.length === 0) {
      return null
    }

    const labelId = `${this.state.listId}-header-label`

    // Using a fieldset with a legend seems to be the way to go here since
    // we can't use a label to point to a list (https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Content_categories#Form_labelable).
    // See http://stackoverflow.com/a/13273907/2114
    return (
      <div className="vertical-segmented-control">
        {label && (
          <p className="vertical-segmented-control-header-label" id={labelId}>
            {label}
          </p>
        )}
        <RadioGroup<T>
          ariaLabelledBy={labelId}
          className="vertical-segmented-control-radio-group"
          selectedKey={selectedKey}
          radioButtonKeys={items.map(item => item.key)}
          onSelectionChanged={onSelectionChanged}
          renderRadioButtonLabelContents={this.renderItem}
        />
      </div>

      // <fieldset
      //   className="vertical-segmented-control"
      //   ref={this.onFieldsetRef}
      //   id={this.state.listId}
      //   role="radiogroup"
      // >
      //   {label}
      //   {this.props.items.map((item, index) => this.renderItem(item, index))}
      // </fieldset>
    )
  }
}

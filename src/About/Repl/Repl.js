/* @flow */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {html, forward, Effects} from 'reflex'
import {merge, always, batch} from '../../Common/Prelude'
import {StyleSheet} from '../../Common/Style'
import * as Cell from './Repl/Cell'
import * as Unknown from '../../Common/Unknown'
import * as Host from './Repl/Host'
import * as Input from './Repl/Input'
import * as Output from './Repl/Output'

import {onWindow} from '@driver'

import type {Address, DOM} from 'reflex'
import type {Integer} from '../../Common/Prelude'

export type Model = {
  nextID: Integer,
  active: Integer,
  order: [Cell.ID],
  cells: {
    [key: Cell.ID]: Cell.Model
  }
}

export type Action =
  | {type: 'CreateCell'}
  | {type: 'Focus'}
  | {
    type: 'Evaluate',
    id: Cell.ID,
    evaluate: Input.Model
  }
  | {
    type: 'Print',
    id: Cell.ID,
    print: Output.Model
  }
  | {
    type: 'Cell',
    id: Cell.ID,
    cell: Cell.Action
  }

// Actions

const CreateCell = ({
  type: 'CreateCell'
})

const Focus = ({
  type: 'Focus'
})

const Evaluate = (id, input) => ({ // eslint-disable-line no-unused-vars
  type: 'Evaluate',
  id,
  source: input
})

const Print = (id, version) =>
  result => ({
    type: 'Print',
    id,
    print: {
      version,
      result
    }
  })

const ByID = id =>
  action => CellAction(id, action)

const CellAction = (id, action) => (
  action.type === 'Submit' ? {
    type: 'Evaluate',
    id,
    evaluate: action.submit
  }
  : {
    type: 'Cell',
    id,
    cell: action
  }
)

export const init = ():[Model, Effects<Action>] =>
  createCell({
    nextID: 0,
    order: [],
    cells: {},
    active: -1
  })

const createCell = model => {
  const id = String(model.nextID)
  const [cell, fx] = Cell.init(id)
  const state = merge(
    model,
    {
      nextID: model.nextID + 1,
      order: [...model.order, id],
      active: model.nextID,
      cells: merge(
        model.cells,
        {[id]: cell}
      )
    }
  )
  return [state, fx.map(ByID(id))]
}

const updateCell = (model, id, action) => (
  model.cells[id] == null ? [
    model,
    Effects.none
  ]
  : swapCell(model, id, Cell.update(model.cells[id], action))
)

const swapCell = (model, id, [cell, fx]) => {
  const result = [
    merge(
      model,
      {
        cells: merge(
          model.cells,
          {[id]: cell}
        )
      }
    ),
    fx.map(ByID(id))
  ]
  return result
}

const focus = model =>
  updateCell(
    model,
    String(model.active),
    Cell.Edit
  )

const evaluate = (model, {id, evaluate: source}) => [
  model,
  Effects.perform(Host.evaluate(id, source.value))
    .map(Print(id, source.version))
]

const isActive = (model, id) =>
  model.active === id

const isLast = (model, id) =>
  model.order[model.order.length - 1] === id

const print = (model, action) => (
  (isActive(model, action.id) && isLast(model, action.id))
  ? batch(
      update,
      model,
      [CreateCell, action]
    )
  : updateCell(
      model,
      action.id,
      Cell.Print(action.print)
    )
)

export const update =
  (model:Model, action:Action):[Model, Effects<Action>] => {
    switch (action.type) {
      case 'Cell':
        return updateCell(model, action.id, action.cell)
      case 'Evaluate':
        return evaluate(model, action)
      case 'Print':
        return print(model, action)
      case 'Focus':
        return focus(model)
      case 'CreateCell':
        return createCell(model)
      default:
        return Unknown.update(model, action)
    }
  }

const styleSheet = StyleSheet.create({
  base: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: '0px',
    left: '0px',
    color: '#839496',
    backgroundColor: '#002b36',
    fontSize: '12px',
    fontFamily: 'Menlo, Courier, monospace',
    lineHeight: '14px',
    overflow: 'auto'
  }
})

export const view =
  (model:Model, address:Address<Action>):DOM => html.div(
    {
      style: styleSheet.base,
      id: 'repl',
      onWindowFocus: onWindow(address, always(Focus))
    },
    [
      ...Object
        .keys(model.cells)
        .map(id => Cell.view(
          model.cells[id],
          forward(address, ByID(id))
        )),
      html.meta({
        name: 'theme-color',
        content: `${styleSheet.base.backgroundColor}|${styleSheet.base.color}`
      })
    ]
  )

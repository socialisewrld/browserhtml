/* @flow */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {html, forward} from 'reflex'
import {always} from '../../../Common/Prelude'
import * as Style from '../../../Common/Style'

import type {Address, DOM} from 'reflex'
import type {URI} from '../../../Common/Prelude'

export type {URI}
export type ID = string
export type Color = string

export type Model = {
  src: ?URI,
  color: string,
  isDark: boolean
}

export type Action =
  | { type: 'Choose' }

const Choose:Action = {
  type: 'Choose'
}

const styleSheet = Style.createSheet({
  base: {
    border: '1px solid rgba(0,0,0,0.15)',
    cursor: 'pointer',
    borderRadius: '50%',
    display: 'inline-block',
    width: '10px',
    height: '10px',
    margin: '0 2px'
  }
})

export const view =
  (model:Model, address:Address<Action>):DOM => (
    html.div({
      className: 'wallpaper-choice',
      onClick: forward(address, always(Choose)),
      style: Style.mix(
        styleSheet.base,
        { backgroundColor: model.color }
      )
    })
  )

/* @flow */

import {Effects, Task, html, thunk} from 'reflex'
import {merge, nofx} from '../Common/Prelude'
import {ok, error} from '../Common/Result'
import * as Runtime from '../Common/Runtime'
import * as Unknown from '../Common/Unknown'
import * as Style from '../Common/Style'

import type {Address, Never, DOM} from 'reflex'
import type {Result} from '../Common/Result'

export type Model <model, action> = // eslint-disable-line no-unused-vars
  { snapshotURI: string,
   error: ?Error,
   replayed: boolean
  }

export type Action <model, action> =
  | { type: "Load" }
  | { type: "Snapshot", result: Result<Error, model> }
  | { type: "Replay", replay: model }
  | { type: "Debuggee", debuggee: action }

type Step <model, action> =
  [ Model<model, action>,
   Effects<Action<model, action>>
  ]

const Load = { type: 'Load' }

const Snapshot = <model, action>
  (result:Result<Error, model>):Action<model, action> =>
  ({ type: 'Snapshot',
     result
    }
  )

const Replay = <model, action>
  (model:model):Action<model, action> =>
  ({ type: 'Replay',
     replay: model
    }
  )

export const init = <model, action, flags>
  (flags:flags):Step<model, action> =>
  ([ { flags,
       snapshotURI: String(Runtime.env.replay),
       error: null,
       replayed: false
      },
     Effects.receive(Load)
    ]
  )

export const update = <model, action>
  (model:Model<model, action>,
   action:Action<model, action>
  ):Step<model, action> =>
  (action.type === 'Load'
  ? loadSnapshot(model)
  : action.type === 'Snapshot'
  ? receiveSnapshot(model, action.result)
  : action.type === 'Debuggee'
  ? nofx(model)
  : Unknown.update(model, action)
  )

const receiveSnapshot = <model, action>
  (model:Model<model, action>,
   result:Result<Error, model>
  ):Step<model, action> =>
  (result.isOk
  ? [ merge(model, {replayed: true}),
     Effects.receive(Replay(result.value))
    ]
  : nofx(merge(model, {error: result.error}))
  )

const loadSnapshot = <model, action>
  (model:Model<model, action>):Step<model, action> =>
  [ model,
   Effects.perform(fetchSnapshot(model.snapshotURI))
    .map(Snapshot)
  ]

const fetchSnapshot = <model>
  (uri:string):Task<Never, Result<Error, model>> => new Task(succeed => {
    const request = new window.XMLHttpRequest({mozSystem: true})
    request.open('GET',
     uri,
     true
    )

    request.overrideMimeType('application/json')
    request.responseType = 'json'
    request.send()

    request.onload =
      () =>
      succeed(request.status === 200
      ? ok(request.response)
      : request.status === 0
      ? ok(request.response)
      : error(Error(`Failed to fetch ${uri} : ${request.statusText}`))
      )
  })

export const render = <model, action>
  (model:Model<model, action>,
   address:Address<Action<model, action>>
  ):DOM =>
  html.dialog({ id: 'replay',
     style: Style.mix(styleSheet.base,
       (model.replayed === true
        ? styleSheet.loaded
        : styleSheet.loading
        )
      ),
     open: true
    },
   [ html.h1(null,
       [ (model.error != null
          ? String(model.error)
          : model.replayed
          ? ''
          : `Loading snapshot from ${model.snapshotURI}`
          )
        ]
      )
    ]
  )

export const view = <model, action>
  (model:Model<model, action>,
   address:Address<Action<model, action>>
  ):DOM =>
  thunk('replay',
   render,
   model,
   address
  )

const styleSheet = Style.createSheet({ base:
      { position: 'absolute',
       pointerEvents: 'none',
       background: '#fff',
       height: '100%',
       width: '100%',
       textAlign: 'center',
       lineHeight: '100vh',
       textOverflow: 'ellipsis',
       whiteSpace: 'nowrap'
      },
     loaded:
      { opacity: 0
      },
     loading:
      { opaticy: 1
      }
    }
  )

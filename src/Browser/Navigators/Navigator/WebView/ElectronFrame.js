/* @flow */

import {Task, node, forward} from 'reflex'
import * as Style from '../../../../Common/Style'
import {on, setting} from '@driver'
import {always} from '../../../../Common/Prelude'

import type {Address, DOM} from 'reflex'
import type {Model, Action} from '../WebView'
import {performance} from '../../../../Common/Performance'

const Blur = always({ type: 'Blur' })
const Focus = always({ type: 'Focus' })
const Close = always({ type: 'Close' })
const DocumentFirstPaint = always({ type: 'DocumentFirstPaint' })

export const view =
  (styleSheet:{ base: Style.Rules },
   selected:boolean,
   model:Model,
   address:Address<Action>
  ):DOM =>
  node('webview',
   { [model.ref.name]: model.ref.value,
     location: setting(location, model.navigation.url),
     'data-name': model.name,
     'data-features': model.features,
    // Stock electron does not actually connect a window with it's opener in any
    // way. Brave desktop browser has patched Electron to add support for it
    // via `data-guest-instance-id` attribute. Once that patch is uplifted
    // this will take take care of connecting a window and it's opener. For more
    // details see: https://github.com/browserhtml/browserhtml/issues/566
      'data-guest-instance-id':
      (model.guestInstanceId == null
      ? void (0)
      : model.guestInstanceId
      ),
     style: Style.mix(styleSheet.base,
       (model.page.pallet.background != null
        ? { backgroundColor: model.page.pallet.background }
        : null
        )
      ),

    // Events

      onBlur: forward(address, Blur),
     onFocus: forward(address, Focus),
     onClose: on(address, Close),
     'onNew-Window': on(address, decodeOpenWindow),
     'onPage-Favicon-Updated': on(address, decodeIconChange),
     'onPage-Title-Updated': on(address, decodeTitleChange),
     'onDid-Start-Loading': on(address, decodeLoadStart),
     'onDid-Navigate': on(address, decodeLocationChange),
     'onDid-Fail-Load': on(address, decodeLoadFail),
     'onDid-Stop-Loading': on(address, decodeLoadEnd),
     'onDid-Change-Theme-Color': on(address, decodeMetaChange),
     'onDOM-Ready': forward(address, DocumentFirstPaint)

    }
  )

// See: http://electron.atom.io/docs/v0.37.4/api/web-view-tag/#event-new-window
const decodeOpenWindow =
  (event) =>
  ({ type: 'Open',
     options:
      { uri: event.url,
       name: event.frameName,
       disposition: event.disposition,
       features: '',
       guestInstanceId:
        ((event.options != null &&
            event.options.webPreferences != null
          )
        ? event.options.webPreferences.guestInstanceId
        : null
        ),
       ref: null,
       options: event.options
      }
    }
  )

// See: http://electron.atom.io/docs/v0.37.4/api/web-view-tag/#event-page-favicon-updated
const decodeIconChange =
  (event) =>
  ({ type: 'IconChanged',
     icon:
      { href:
        (event.favicons.length > 0
        ? event.favicons[0]
        : ''
        ),
       rel: null
      }
    }
  )

// See: http://electron.atom.io/docs/v0.37.4/api/web-view-tag/#event-page-title-updated
const decodeTitleChange =
  (event) =>
  ({ type: 'TitleChanged',
     title: event.title
    }
  )

// See: http://electron.atom.io/docs/v0.37.4/api/web-view-tag/#event-load-commit
const decodeLoadStart =
  (event) =>
  ({ type: 'LoadStart',
     time: performance.now()
    }
  )

// See: http://electron.atom.io/docs/v0.37.4/api/web-view-tag/#event-did-frame-finish-load
const decodeLoadEnd =
  (event) =>
  ({ type: 'LoadEnd',
     time: performance.now()
    }
  )

// See: http://electron.atom.io/docs/v0.37.4/api/web-view-tag/#event-did-fail-load
const decodeLoadFail =
  (event) =>
  ({ type: 'LoadFail',
     time: performance.now(),
     reason: event.errorDescription,
     code: event.errorCode
    }
  )

// @TODO: We are missing "Connected" event and I think 'did-get-response-details'
// maybe it in electron.
// See: http://electron.atom.io/docs/v0.37.4/api/web-view-tag/#event-did-get-response-details

// See: http://electron.atom.io/docs/v0.37.4/api/web-view-tag/#event-did-navigate
// TODO: Consider `will-navigate` event instead.
const decodeLocationChange =
  (event) =>
  ({ type: 'LocationChanged',
     uri: event.url,
     time: performance.now(),
     canGoBack: event.target.canGoBack(),
     canGoForward: event.target.canGoForward()
    }
  )

// See: http://electron.atom.io/docs/v0.37.4/api/web-view-tag/#event-did-change-theme-color
const decodeMetaChange =
  (event) =>
  ({ type: 'MetaChanged',
     name: 'theme-color',
     content: event.themeColor
    }
  )

const location =
  (element, url) =>
  new Task((succeed, fail) => {
    if (!element.onURLChange) {
      element.onURLChange = onURLChange
      element.addEventListener('did-navigate', onURLChange)
    }

    if (element.dataset.url !== url) {
      element.setAttribute('src', url)
    }

    element.dataset.url = url
  })

const onURLChange =
  event =>
  (event.target.dataset.url = event.url)

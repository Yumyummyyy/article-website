/*
ISSUES

2. Fix backend and fronend categories to check if got duplicates
3. Redo backclickdetector so can share one div

*/

import React, { memo, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Authorizer from '../../Shared/Authorizer'
import styles from '../edit.module'
import { Operation, Operations } from './Operations'

import { TutorialWrapper } from '../Hints'

import { preventZoom, preventZoomScroll } from '../PreventDefault'
import { mouseDown, mouseUp, mouseMove } from '../Events'
import * as BudUtils from '../Bud/BudUtils'
import * as OtherElements from '../OtherElements'
import { undo, redo } from '../TaskBar/UndoRedo'

import { ContextMenu } from './ContextMenu'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBackspace } from '@fortawesome/free-solid-svg-icons'

import api from '../../../services/api'

import * as SilkShapes from '../Silk'
import * as BudShapes from '../Bud'

import * as utils from '../utils'
import { DrawCanvas } from './DrawCanvas'
import { TaskBar } from '../TaskBar'
import { Settings } from '../Settings'
import { FileInsert } from '../Shared/FileInsert'

import Konva from 'konva'
import { BudView } from '../Select/BudView'
import { setBud } from '../Bud/BudUtils'
import { Keybinds } from './keybinds'

import { Categories, Category } from '../Category'

Konva.hitOnDragEnabled = true

const gridLink = "http://phrogz.net/tmp/grid.gif"

function MouseMoveDetector() {
  useEffect(() => {
    const mousePosWrapper = (e) => {
      utils.getGlobals().mousePos = {x: e.pageX, y: e.pageY}
    }
    document.addEventListener('mousemove', mousePosWrapper)
  }, [])
  return <></>
}

function SetGlobal() {
  useEffect(() => {
    window.spoodawebVars = {}
    window.spoodawebVars.react = {}
  }, [])
  return <></>
}

const scrollRight = (amt) => {
  utils.getGlobals().scrolling = true
  const rootPos = utils.getRootPos()
  utils.setRootPos({x: rootPos.x - amt, y: rootPos.y})
}

const scrollDown = (amt) => {
  utils.getGlobals().scrolling = true
  const rootPos = utils.getRootPos()
  utils.setRootPos({x: rootPos.x, y: rootPos.y - amt})
}

function Edit() {
  const navigate = useNavigate()
  const [ dragging, setDragging ] = useState(false)
  const [ toggleCanDragLine, setToggleCanDragLine ] = useState(false)
  const [ rendered, setRendered ] = useState([])
  const [ inSettings, setInSettings ] = useState(false)
  const [ renderTrain, setRenderTrain ] = useState(false)
  const [ settings, setSettings ] = useState({
    Background: {
      value: false,
      html: (
        <FileInsert></FileInsert>
      ),
    }
  })
  const [ contextMenuOn, setContextMenuOn ] = useState(false)
  const [ contextMenuPos, setContextMenuPos ] = useState({x: 0, y: 0})
  useEffect(async () => {
    const width = utils.getStage().getAttr('width')
    const height = utils.getStage().getAttr('height')
    utils.getStage().on('mousedown', evt => {
      utils.getReactNamespace('renderTrain').setVal(utils.getReactNamespace('renderTrain').val)
    })
    document.getElementById('divCanvas').addEventListener('wheel', e => {
      scrollDown(e.deltaY)
      scrollRight(e.deltaX)
    })
    let boxStart = null
    let boxEnd = null
    const mouseclickUnselectAll = (e) => {
      if (e.evt.button !== 0) return
      if (!utils.getGlobals().selecting) {
        utils.clearSelected()
      }
    }
    utils.getStage().on('click', mouseclickUnselectAll)
    const mousemove = (e) => {
      if (utils.getGlobals().dragging || utils.getGlobals().modes.autoDrag) {
        document.removeEventListener('mousemove', mousemove)
        stopSelecting({button: 0})
        return
      }
      boxEnd = utils.getCanvasMousePos(e.clientX, e.clientY)
      const selectBox = utils.getMainLayer().find('#selectBox')[0]
      selectBox.setAttr('width', boxEnd.x - boxStart.x)
      selectBox.setAttr('height', boxEnd.y - boxStart.y)
      for (const bud of utils.getBudGroup().children) {
        const objId = bud.getAttr('objId')
        const budObj = utils.getObjById(objId)
        if (budObj.selected) continue
        const points = BudUtils.hexagonPoints(40, bud.getX(), bud.getY())
        for (const point of points) {
          const inside = utils.withinRect(boxStart, boxEnd, point)
          // console.log("point", point, "pos", pos, inside)
          if (inside) {
            budObj.select()
            break
          }
        }
      }
      for (const _silk of utils.getSilkGroup().children) {
        const silkId = _silk.getAttr('silkId')
        const silkObj = utils.getSilkById(silkId)
        if (silkObj.selected) continue
        const silk = silkObj.silkObj
        const points = silk.getPoints()

        const pos1 = {x: points[0], y: points[1]}
        const pos2 = {x: points[2], y: points[3]}

        const inRect1 = utils.withinRect(boxStart, boxEnd, pos1)
        if (inRect1) { silkObj.select(); continue }
        const inRect2 = utils.withinRect(boxStart, boxEnd, pos2)
        if (inRect2) { silkObj.select(); continue }

        const topIntersectsLine = utils.linesIntersect(
          [boxStart, {x: boxEnd.x, y: boxStart.y}],
          [pos1, pos2],
        )
        if (topIntersectsLine) { silkObj.select(); continue }
        const bottomIntersectsLine = utils.linesIntersect(
          [boxEnd, {x: boxStart.x, y: boxEnd.y}],
          [pos1, pos2],
        )
        if (bottomIntersectsLine) { silkObj.select(); continue }
        const leftIntersectsLine = utils.linesIntersect(
          [boxStart, {x: boxStart.x, y: boxEnd.y}],
          [pos1, pos2],
        )
        if (leftIntersectsLine) { silkObj.select(); continue }
        const rightIntersectsLine = utils.linesIntersect(
          [boxEnd, {x: boxEnd.x, y: boxStart.y}],
          [pos1, pos2],
        )
        if (rightIntersectsLine) { silkObj.select(); continue }
      }
    }
    const isDrag = () => {
      document.addEventListener('mousemove', mousemove)
      utils.getGlobals().selecting = true
      document.removeEventListener('mousemove', isDrag)
    }
    const stopSelecting = e => {
      if (e.button !== 0) return
      const selectBox = utils.getMainLayer().find('#selectBox')[0]
      selectBox.destroy()
      document.removeEventListener('mousemove', mousemove)
      utils.getGlobals().selecting = false
      document.removeEventListener('mousemove', isDrag)
      document.removeEventListener('mouseup', stopSelecting)
    }
    document.getElementById('divCanvas').addEventListener('mousedown', e => {
      if (e.button !== 0) return
      boxEnd = null
      boxStart = utils.getCanvasMousePos(e.clientX, e.clientY)
      const selectBox = new Konva.Rect({
        x: boxStart.x,
        y: boxStart.y,
        width: 0,
        height: 0,
        fill: 'black',
        opacity: 0.4,
        id: 'selectBox',
      })
      utils.getMainLayer().add(selectBox)
      if (!utils.getGlobals().dragging) {
        document.addEventListener('mousemove', isDrag)
        document.addEventListener('mouseup', stopSelecting)
      }
    })
    setInterval(() => {
      if (utils.getGlobals().scrolling) {
        utils.getGlobals().scrolling = false
        utils.reloadObjs()
        return
      }
    }, 1000);
    const rootPos = utils.getRootPos() || {x: 0, y: 0}
    const globals = utils.getGlobals()
    globals.newObjs = []
    globals.addedObj = false
    globals.objs = {}
    globals.rootPos = {x: 0, y: 0}
    globals.history = []
    globals.historyIndex = -1
    globals.triggerDragLine = false
    globals.draggingLine = false
    globals.selected = {buds: {}, silks: {}}
    globals.viewing = null
    globals.unselectFunc = null
    globals.silkObjs = {}
    globals.modes = {
      autoDrag: false,
      gluing: false,
    }
    globals.lastMousePos = null
    globals.mousePos = null
    globals.dragging = false
    globals.selecting = false
    globals.testedPath = []
    globals.scrolling = false
    globals.wasScrolling = false
    globals.dragging = false // to tell if to use the box select

    globals.recentlyViewed = []
    globals.inRecentlyViewed = {bud: {}, category: {}}

    globals.categories = new Categories()
    globals.selectedCategory = false

    const keybinds = new Keybinds(true)
    globals.keybinds = keybinds

    const operations = new Operations()
    globals.operations = operations

    const deleteFunc = () => {
      console.log(utils.getGlobals().viewing)
      if (utils.getGlobals().viewing) return
      console.log(utils.getGlobals().viewing)
      const buds = utils.getGlobals().selected.buds
      const silks = utils.getGlobals().selected.silks
      console.log(buds, silks)
      const redoFunc = () => {
        for (const { obj } of Object.values(buds)) {
          obj._delete()
        }
        for (const { obj } of Object.values(silks)) {
          obj._delete()
        }
      }
      const undoFunc = () => {
        for (const { obj } of Object.values(buds)) {
          obj.restore()
        }
        for (const { obj } of Object.values(silks)) {
          obj.restore()
        }
      }
      utils.addToHistory(undoFunc, redoFunc)
      redoFunc()
    }
    const del = new Operation(
      'Delete',
      deleteFunc,
      [['Backspace', <FontAwesomeIcon icon={faBackspace} />]],
      utils.ObjType.All
    )
    operations.add(del)

    const leUndo = new Operation(
      'Undo',
      undo,
      [['Control', 'ctrl'], ['z']],
      // [['u']], // vim keybindings lmao
      utils.ObjType.Default
    )
    operations.add(leUndo)

    const leRedo = new Operation(
      'Redo',
      redo,
      [['Control', 'ctrl'], ['Shift', 'shift'], ['z']],
      // [['Control', 'ctrl'], ['r']],
      utils.ObjType.Default
    )
    operations.add(leRedo)

    const _newBud = () => {
      const contextMenu = document.getElementById('contextMenu').getBoundingClientRect()
      const pos = contextMenu.left ?
        {x: contextMenu.left, y: contextMenu.top}
        : utils.getGlobals().mousePos
      const canvasPos = utils.getCanvasMousePos(pos.x, pos.y)
      const actualPos = utils.calcPosByKonvaPos(canvasPos.x, canvasPos.y)
      setBud(actualPos)
    }
    const newBud = new Operation(
      'Insert new bud',
      _newBud,
      [['Control', 'ctrl'], ['m']],
      utils.ObjType.Default,
    )
    operations.add(newBud)

    //const _attach = () => {
      //const modes = utils.getGlobals().modes
      //modes.gluing = !(modes.gluing)
    //}
    //const attach = new Operation(
      //'Attach to bud',
      //_attach,
      //[['Control', 'ctrl'], ['v']],
      //utils.ObjType.Bud
    //)
    //operations.add(attach)

    const link = new Operation(
      'Link',
      utils.link,
      [['Control', 'ctrl'], ['Shift', 'shift'], ['l', 'L']],
      utils.ObjType.Selected
    )
    operations.add(link)

    const _autodrag = () => {
      const modes = utils.getGlobals().modes
      modes.autoDrag = !(modes.autoDrag)
    }
    const autodrag = new Operation(
      'Autodrag',
      _autodrag,
      [['Control', 'ctrl'], ['Shift', 'shift'], ['u']],
      utils.ObjType.Default
    )
    operations.add(autodrag)

    document.addEventListener('keydown', preventZoom)
    document.addEventListener('wheel', preventZoomScroll, { passive: false })

    utils.setRootPos({x: 0, y: 0})
    const scrollAmt = 20
    keybinds.add(['ArrowUp'], () => scrollDown(-scrollAmt))
    keybinds.add(['ArrowDown'], () => scrollDown(scrollAmt))
    keybinds.add(['ArrowLeft'], () => scrollRight(-scrollAmt))
    keybinds.add(['ArrowRight'], () => scrollRight(scrollAmt))
    const mouseMoveFunc = (e) => {
      const pos = {x: e.screenX, y: e.screenY}
      const globals = utils.getGlobals()
      if (!globals.lastMousePos) {
        globals.lastMousePos = pos
      }
      const multiplier = 2
      const diff = {x: globals.lastMousePos.x - pos.x, y: globals.lastMousePos.y - pos.y}
      scrollDown(-diff.y * multiplier)
      scrollRight(-diff.x * multiplier)
      utils.getGlobals().lastMousePos = pos
    }
		document.getElementById('divCanvas').addEventListener('contextmenu', e => {
      e.preventDefault()
      setContextMenuOn(true)
      setContextMenuPos({x: e.clientX, y: e.clientY})
		})
    const stopDrag = () => {
      const globals = utils.getGlobals()
      utils.setCursor("default")
      globals.lastMousePos = null
      document.removeEventListener('mouseup', stopDrag)
      document.removeEventListener('mousemove', mouseMoveFunc)
    }
    utils.getStage().on('mousedown', (e) => {
      if (e.evt.button === 1) {
        utils.setCursor("grab")
        document.addEventListener('mousemove', mouseMoveFunc)
        const func = () => {
          // utils.getGlobals().dragging = true
          document.removeEventListener('mousemove', func)
          document.addEventListener('mouseup', stopDrag)
        }
        document.addEventListener('mousemove', func)
        const otherFunc = () => {
          utils.setCursor("default")
          document.removeEventListener('mouseup', otherFunc)
          document.removeEventListener('mousemove', func)
          document.removeEventListener('mousemove', mouseMoveFunc)
        }
        document.addEventListener('mouseup', otherFunc)
      }
    })
    document.getElementById('divCanvas').addEventListener('mousedown', (e) => {
      // if (utils.getGlobals().dragging) {
      //   utils.getGlobals().dragging = false
      //   return
      // }
      if (e.button === 0) {
        setContextMenuOn(false)
      }
      if (e.button !== 2) return
    })
    const budGroup = new Konva.Group()
    const silkGroup = new Konva.Group()
    utils.getMainLayer().add(budGroup, silkGroup)
    budGroup.setZIndex(1)
    silkGroup.setZIndex(0)
    const urlString = window.location.search
    let paramString = urlString.split('?')[1];
    let queryString = new URLSearchParams(paramString);
    globals.spoodawebId = queryString.get('id')
    let objs = {
      data: {
        spoodawebData: {},
        nextObjId: 0
      }
    }
    try {
      objs = await api.post('/webs/get/objects', {
        spoodawebId: globals.spoodawebId,
      })
    } catch(err) {
      console.log(err)
      console.log('Unable to retrieve objects.')
    }
    globals.nextObjId = objs.data.nextObjId
    const spoodawebData = objs.data.spoodawebData
    const tempObjs = []
    for (const [ categId, categ ] of Object.entries(objs.data.categories)) {
      globals.categories.addWithCategId(new Category(categ.name, categ.color), categId)
    }
    globals.categIds = Object.keys(globals.categories.categories)
    for (const [ objId, obj ] of Object.entries(spoodawebData)) {
      const bud = new BudShapes.Bud(obj.objId)
      bud.init(obj.position, objId)
      bud.fromJson(obj)
      const screenBounds = utils.calcScreenBounds()
      const inRect = utils.withinRect(screenBounds[0], screenBounds[1], obj.position)
      if (!(inRect)) {
        bud.unload()
        continue
      }
      tempObjs.push(bud)
    }
    for (const leObj of tempObjs) {
      for (const attachedTo of leObj.attachedTos) {
        console.log(leObj.objId, attachedTo)
        new SilkShapes.Silk(utils.getNextSilkId(), leObj, utils.getObjById(attachedTo), true)
      }
    }
  }, [])
  return (
    <>
      <Authorizer navigate={navigate} requireAuth={true}></Authorizer>
      <SetGlobal></SetGlobal>
      <utils.SetGlobalReactSetter val={renderTrain} setVal={setRenderTrain} namespace='renderTrain'></utils.SetGlobalReactSetter>
      <MouseMoveDetector></MouseMoveDetector>
			<TutorialWrapper/>
      <Settings
        inSettings={inSettings}
        setInSettings={setInSettings}
        settings={settings}
        setSettings={setSettings}></Settings>
      <TaskBar
        setInSettings={setInSettings}
        ></TaskBar>
      <ContextMenu
        on={contextMenuOn}
        pos={contextMenuPos}
        setContextMenuOn={setContextMenuOn}></ContextMenu>
      <div className={styles.wrapper}>
        <OtherElements.FakeDraggableObj
          dragging={dragging}
          setDragging={setDragging}></OtherElements.FakeDraggableObj>
        <div className={styles.divCanvas} id='divCanvas'>
          <DrawCanvas
            rendered={rendered}></DrawCanvas>
        </div>
        <BudView></BudView>
      </div>
    </>
  )
}
export default Edit

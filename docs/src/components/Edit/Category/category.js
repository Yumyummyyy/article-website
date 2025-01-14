import * as utils from '../utils'

const generateRandomColor = () => {
  const num = Math.floor(Math.random() * 16777216) // max hex number
  let hex = num.toString(16)
  const left = 6 - hex.length
  if (left !== 0) {
    for (let i = 0; i < left; i++) {
      hex += "0"
    }
  }
  return `#${hex}`
}

class Category {
  static colorErrMsg = (color) => new Error(`The color ${color} is invalid, expected hex color (e.g. #100f1e)`)
  type = 'category'
  _name = ''
  _color = ''
  get name() { return this._name }
  set name(val) {
    this._name = val
    utils.sendSaveEvt()
  }
  get color() { return this._color }
  set color(val) {
    this._color = val
    utils.sendSaveEvt()
  }
  _categId = null
  get categId() { return this._categId }
  toJSON = () => {
    return { name: this.name, color: this.color }
  }
  constructor(name, color=null) {
    if (color === null) {
      color = generateRandomColor()
    }
    color = color.toLowerCase()
    if (color.length !== 7 || color.substring(0, 1) !== "#") throw Category.colorErrMsg(color)
    for (const letter of color.substring(1)) {
      if (isNaN(Number(letter)) && !(['a', 'b', 'c', 'd', 'e', 'f'].includes(letter))) {
        throw Category.colorErrMsg(color)
      }
    }
    this.name = name
    this.color = color
  }
}
export { Category }

class Categories {
  nextCategId = 1
  categories = null
  _isChanged = true
  categIds = [0] // to be used in displaying categories
  get isChanged() {
    return this._isChanged
  }
  // adds categories WITH categId set
  addWithCategId = (category, categId) => {
    this.categories[categId] = category
    category._categId = categId
    this.categIds.unshift(categId)
    this._isChanged = true
    this.nextCategId = Math.max(this.nextCategId, category._categId+1)
  }
  addWithoutCategId = (category) => {
    this.addWithCategId(category, this.nextCategId)
  }
  getById = (id) => {
		return id !== null ? this.categories[id] : this.categories[0]
	}
  toJSON = () => {
    const categs = {}
    for (const [ categId, category ] of Object.entries(this.categories)) {
      categs[categId] = category.toJSON()
    }
    delete categs[0]
    return categs
  }
  constructor() {
    this.categories = {
      0: new Category('Default', '#ADD8E6')
    }
  }
}
export { Categories }

/////////////////////////////////////////////////////////////////////////////////////////////
// IMPORT LIBRARIES
/////////////////////////////////////////////////////////////////////////////////////////////

import { Color } from "three";
import { IfcViewerAPI } from "web-ifc-viewer";
import { IFCLoader } from "web-ifc-three";
import {
  IFCWALLSTANDARDCASE,
  IFCSLAB,
  IFCFURNISHINGELEMENT,
  IFCDOOR,
  IFCWINDOW,
  IFCPLATE,
  IFCMEMBER
} from 'web-ifc';



/////////////////////////////////////////////////////////////////////////////////////////////
// AXES, GRID AND SCENE
/////////////////////////////////////////////////////////////////////////////////////////////

const container = document.getElementById('viewer-container');
const viewer = new IfcViewerAPI({ container, backgroundColor: new Color(0xffffff) });
viewer.axes.setAxes();
viewer.grid.setGrid();
const scene = viewer.context.getScene();


/////////////////////////////////////////////////////////////////////////////////////////////
// IFC LOADING
/////////////////////////////////////////////////////////////////////////////////////////////

//const loader = new IFCLoader();
//const input = document.getElementById('file-input');
loadIfc("./01.ifc");
let model;
async function loadIfc(url) {
  model = await viewer.IFC.loadIfcUrl(url);
  await viewer.shadowDropper.renderShadow(model.modelID);
  viewer.context.renderer.postProduction.active = true;

  const project = await viewer.IFC.getSpatialStructure(model.modelID);
  createTreeMenu(project);
}


/////////////////////////////////////////////////////////////////////////////////////////////
// EVENTS
/////////////////////////////////////////////////////////////////////////////////////////////

window.onclick = async () => {
  const result = await viewer.IFC.selector.highlightIfcItem();
  console.log(result);
  if (!result) return;
  const { modelID, id } = result;
  const props = await viewer.IFC.getProperties(modelID, id, true, false);
  createPropertiesMenu(props);
}

window.onmousemove = () => viewer.IFC.selector.prePickIfcItem();

window.ondblclick = () => {
  viewer.IFC.selector.unHighlightIfcItems();
  viewer.IFC.selector.unpickIfcItems();
  removeAllChildren(propsGUI);
}


/////////////////////////////////////////////////////////////////////////////////////////////
// VISIBILITY (CHECKBOXES)
/////////////////////////////////////////////////////////////////////////////////////////////

const categories = {
  IFCWALLSTANDARDCASE,
  IFCSLAB,
  IFCFURNISHINGELEMENT,
  IFCDOOR,
  IFCWINDOW,
  IFCPLATE,
  IFCMEMBER
}

function getName(category) {
  const names = Object.keys(categories);
  return names.find(name => categories[name] === category);
}

async function getAll(category) {
  return viewer.IFC.loader.ifcManager.getAllItemsOfType(model.modelID, category);
}



const subsets = {};

async function setupAllCategories() {
  const allCategories = Object.values(categories);
  for (const category of allCategories) {

  }
}

function setupCategory(category){
  subsets[category] = await newSubsetOfType(category);
}

async function newSubsetOfType(category) {
  const ids = await getAll(category);
  return viewer.IFC.loader.ifcManager.createSubset({
    modelID: model.modelID,
    scene,
    ids,
    removePrevious: true,
    customID: category.toString()
  })
}

/////////////////////////////////////////////////////////////////////////////////////////////
// SPATIAL TREE
/////////////////////////////////////////////////////////////////////////////////////////////

const toggler = document.getElementsByClassName("caret");
let i;
for (i = 0; i < toggler.length; i++) {
  toggler[i].addEventListener("click", function () {
    this.parentElement.querySelector(".nested").classList.toggle("active");
    this.classList.toggle("caret-down");
  });
}

function createTreeMenu(ifcProject) {
  const root = document.getElementById("tree-root");
  removeAllChildren(root);
  const ifcProjectNode = createNestedChild(root, ifcProject);
  for (const child of ifcProject.children) {
    constructTreeMenuNode(ifcProjectNode, child);
  }
}

function constructTreeMenuNode(parent, node) {
  const children = node.children;
  if (children.length === 0) {
    createSimpleChild(parent, node);
    return;
  }
  const nodeElement = createNestedChild(parent, node);
  for (const child of children) {
    constructTreeMenuNode(nodeElement, child);
  }
}

function createSimpleChild(parent, node) {
  const content = nodeToString(node);
  const childNode = document.createElement('li');
  childNode.classList.add('leaf-node');
  childNode.textContent = content;
  parent.appendChild(childNode);

  childNode.onmouseenter = () => {
    viewer.IFC.selector.prepickIfcItemsByID(0, [node.expressID]);
  }

  childNode.onclick = async () => {
    viewer.IFC.selector.highlightIfcItemsByID(0, [node.expressID]);
    const props = await viewer.IFC.getProperties(model.modelID, node.expressID, true, false);
    createPropertiesMenu(props);
  }
}

function createNestedChild(parent, node) {
  const content = nodeToString(node);
  const root = document.createElement('li');
  createTitle(root, content);
  const childrenContainer = document.createElement('ul');
  childrenContainer.classList.add('nested');
  root.appendChild(childrenContainer);
  parent.appendChild(root);
  return childrenContainer;
}

function createTitle(parent, content) {
  const title = document.createElement('span');
  title.classList.add('caret');
  title.onclick = () => {
    title.parentElement.querySelector('.nested').classList.toggle('active');
    title.classList.toggle('caret-down');
  }
  title.textContent = content;
  parent.appendChild(title);
}

function nodeToString(node) {
  return `${node.type} - ${node.expressID}`;
}

/////////////////////////////////////////////////////////////////////////////////////////////
// PROPERTIES MENU
/////////////////////////////////////////////////////////////////////////////////////////////

const propsGUI = document.getElementById("ifc-property-menu-root");

function createPropertiesMenu(properties) {
  //console.log(properties);

  removeAllChildren(propsGUI);
  delete properties.psets;
  delete properties.mats;
  delete properties.type;

  for (let key in properties) {
    createPropertyEntry(key, properties[key]);
  }
}

function createPropertyEntry(key, value) {
  const propContainer = document.createElement("div");
  propContainer.classList.add("ifc-property-item");

  if (value === null || value === undefined) value = "undefined";
  else if (value.value) value = value.value;

  const keyElement = document.createElement("div");
  keyElement.textContent = key;
  propContainer.appendChild(keyElement);

  const valueElement = document.createElement("div");
  valueElement.classList.add("ifc-property-value");
  valueElement.textContent = value;
  propContainer.appendChild(valueElement);

  propsGUI.appendChild(propContainer);
}

function removeAllChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

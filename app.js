/////////////////////////////////////////////////////////////////////////////////////////////
// IMPORT LIBRARIES
/////////////////////////////////////////////////////////////////////////////////////////////

import { Color, LineBasicMaterial, MeshBasicMaterial } from "three";
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
import Drawing from "dxf-writer";

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
let allPlans;
async function loadIfc(url) {
  //Load Model
  model = await viewer.IFC.loadIfcUrl(url);
  await viewer.shadowDropper.renderShadow(model.modelID);  
  model.removeFromParent();
  togglePickable(model, false);


  // Categories Checkboxes  
  toggleShadow();
  togglePostProduction(true);
  setupAllCategories();

  // Spatial Structure
  const project = await viewer.IFC.getSpatialStructure(model.modelID);
  createTreeMenu(project);

  // Floorplans
  await viewer.plans.computeAllPlanViews(model.modelID);
  createFloorPlans();

}


/////////////////////////////////////////////////////////////////////////////////////////////
// FLOORPLANS
/////////////////////////////////////////////////////////////////////////////////////////////

async function createFloorPlans(){
	const lineMaterial = new LineBasicMaterial({ color: 'black' });
	const baseMaterial = new MeshBasicMaterial({
		polygonOffset: true,
		polygonOffsetFactor: 1, // positive value pushes polygon further away
		polygonOffsetUnits: 1,
	});
	await viewer.edges.create('example', model.modelID, lineMaterial, baseMaterial);
  const container = document.getElementById('button-container');
  allPlans = viewer.plans.getAll(model.modelID);  
  for(const plan of allPlans){
    const currentPlan = viewer.plans.planLists[model.modelID][plan];
    console.log(currentPlan);
    const button = document.createElement('button');
    container.appendChild(button);
    button.textContent = currentPlan.name;
    button.onclick = () => {
      viewer.plans.goTo(model.modelID, plan);
      viewer.edges.toggle('example-edges', true);
      togglePostProduction(false);
    }
  }
  const button = document.createElement('button');
  container.appendChild(button);
  button.textContent = 'Exit floorplans';
  button.onclick = () => {
    viewer.plans.exitPlanView();
    viewer.edges.toggle('example-edges', false);
    togglePostProduction(true);
    toggleShadow(true);
  }
  await setupFloorplans(container);

}

function togglePostProduction(active){
  viewer.context.renderer.postProduction.active = active;
}

function toggleShadow(active){
  const shadows = Object.values(viewer.shadowDropper.shadows);
  for (const shadow of shadows){
    shadow.root.visible = active;
  }
}

/////////////////////////////////////////////////////////////////////////////////////////////
// FLOORPLANS EXPORT
/////////////////////////////////////////////////////////////////////////////////////////////

async function setupFloorplans(container) {
  const project = await viewer.IFC.getSpatialStructure(model.modelID);
  const storeys = project.children[0].children[0].children;

  for(const storey of storeys){
    for(const child of storey.children){
      if(child.children.length){
        storey.children.push(...child.children);
      }
    }
  }

  viewer.dxf.initializeJSDXF(Drawing);

  for(const plan of allPlans){
    const currentPlan = viewer.plans.planLists[model.modelID][plan];
    const button = document.createElement('button');
    container.appendChild(button);
    button.textContent = "Export " + currentPlan.name;
    button.onclick = () => {
      const storey = storeys.find(storey => storey.expressID === currentPlan.expressID);
      exportDXF(storey, currentPlan, model.modelID)
    }
  }
}

const dummySubsetMaterial = new MeshBasicMaterial({visible: false});

async function exportDXF(storey, plan, modelID){
  // New drawing if it doesn't exist
  if(!viewer.dxf.drawings[plan.name]) {
    viewer.dxf.newDrawing(plan.name);
  }

  const ids = storey.children.map(item => item.expressID);
  if(!ids) return;

  const subset = viewer.IFC.loader.ifcManager.createSubset({
    modelID,
    ids,
    removePrevious: true,
    customID: 'floor_plan_generation',
    material: dummySubsetMaterial
  })

  const filteredPoints = [];
  const edges = await viewer.edgesProjector.projectEdges(subset);
  const positions = edges.geometry.attributes.position.array;

	const tolerance = 0.01;
	for (let i = 0; i < positions.length - 5; i += 6) {

		const a = positions[i] - positions[i + 3];
		// Z coords are multiplied by -1 to match DXF Y coordinate
		const b = -positions[i + 2] + positions[i + 5];

		const distance = Math.sqrt(a * a + b * b);

		if (distance > tolerance) {
			filteredPoints.push([positions[i], -positions[i + 2], positions[i + 3], -positions[i + 5]]);
		}
  }
  viewer.dxf.drawEdges(plan.name, filteredPoints, 'Projection', Drawing.ACI.BLUE, 'CONTINOUS');

  edges.geometry.dispose();

  viewer.dxf.drawNamedLayer(plan.name, plan, 'thick', 'Section', Drawing.ACI.RED, 'CONTINOUS');
  viewer.dxf.drawNamedLayer(plan.name, plan, 'thin', 'Section-Secondary', Drawing.ACI.CYAN, 'CONTINOUS');

  const result = viewer.dxf.exportDXF(plan.name);
  const link = document.createElement('a');
  link.download = 'floorplan.dxf';
  link.href = URL.createObjectURL(result);
  document.body.appendChild(link);
  link.click();
  link.remove();
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
    setupCategory(category);
  }
}

async function setupCategory(category){
  const subset = await newSubsetOfType(category);
  subsets[category] = subset; 
  togglePickable(subset, true);
  setupCheckbox(category);
}

function setupCheckbox(category){
  const name = getName(category);
  const checkbox = document.getElementById(name);
  checkbox.addEventListener('change', () => {
    const subset = subsets[category];
    if(checkbox.checked) {
      scene.add(subset);
      togglePickable(subset, true);
    }
    else {
      subset.removeFromParent()
      togglePickable(subset, false)
    };
    viewer.context.renderer.postProduction.update();
  })
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

function togglePickable(mesh, isPickable){
  const pickable = viewer.context.items.pickableIfcModels;
  if(isPickable){
    pickable.push(mesh);
  }
  else{
    const index = viewer.context.items.pickableIfcModels.indexOf(mesh);
    pickable.splice(index,1);
  }
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

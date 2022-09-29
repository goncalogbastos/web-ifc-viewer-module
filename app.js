import { Color } from "three";
import { IfcViewerAPI } from "web-ifc-viewer";
import {IFCLoader} from "web-ifc-three";

const container = document.getElementById('viewer-container');
const viewer = new IfcViewerAPI({container,backgroundColor: new Color(0xffffff)});

viewer.axes.setAxes();
viewer.grid.setGrid();


// IFC Loading
//const loader = new IFCLoader();
//const input = document.getElementById('file-input');
loadIfc("./01.ifc");

async function loadIfc(url){
  const model = await viewer.IFC.loadIfcUrl(url);
  await viewer.shadowDropper.renderShadow(model.modelID);
  viewer.context.renderer.postProduction.active = true;
}




// Properties menu

window.onmousemove = () => viewer.IFC.selector.prePickIfcItem();
window.onclick = () => viewer.IFC.selector.unHighlightIfcItems();

window.ondblclick = async () => {
  const result = await viewer.IFC.selector.highlightIfcItem();
  if (!result) return;
  const {modelID,id} = result;
  const props = await viewer.IFC.getProperties(modelID,id, true, false);
  createPropertiesMenu(props);
}

const propsGUI = document.getElementById("ifc-property-menu-root");

function createPropertiesMenu(properties){
  console.log(properties);

  removeAllChildren(propsGUI);
  delete properties.psets;
  delete properties.mats;
  delete properties.type;
  
  for (let key in properties){
    createPropertyEntry(key, properties[key]);
  }
}

function createPropertyEntry(key,value){
  const propContainer = document.createElement("div");
  propContainer.classList.add("ifc-property-item");

  if(value === null || value === undefined) value = "undefined";
  else if(value.value) value = value.value;

  const keyElement = document.createElement("div");
  keyElement.textContent = key;
  propContainer.appendChild(keyElement);

  const valueElement = document.createElement("div");
  valueElement.classList.add("ifc-property-value");
  valueElement.textContent = value;
  propContainer.appendChild(valueElement);

  propsGUI.appendChild(propContainer);
}

function removeAllChildren(element){
  while(element.firstChild){
    element.removeChild(element.firstChild);
  }
}




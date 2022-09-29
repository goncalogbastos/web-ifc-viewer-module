import { Color } from "three";
import { IfcViewerAPI } from "web-ifc-viewer";
import {IFCLoader} from "web-ifc-three";

const container = document.getElementById('viewer-container');
const viewer = new IfcViewerAPI({container,backgroundColor: new Color(0xffffff)});

viewer.axes.setAxes();
viewer.grid.setGrid();


// IFC Loading
const loader = new IFCLoader();
const input = document.getElementById('file-input');

async function load(){
  const model = await viewer.IFC.loadIfcUrl('./01.ifc');

  await viewer.shadowDropper.renderShadow(model.modelID);
  viewer.context.renderer.postProduction.active = true;


}

load();
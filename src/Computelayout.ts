import { BOM } from "./extension";
import FontSizes from "../IconConfig/Fontsize.json";
import * as vscode from 'vscode';

// interface used for the font size
interface fsize {
	[key:number]:number;
}

// fuction that computes a bbobx size using a string and a font definition
export function ComputeBBOXjson (font:string, size:number, str:string):number{
	let tmplength:number=0;
	const Fontobj=FontSizes.find(f => f.Font==font && f.size==size);
	if (Fontobj !==undefined){

		const sizedict:fsize=Fontobj.sizes;

		for (let i=0; i<str.length ;i++){
			const charcode:number=str.charCodeAt(i);

			if (charcode>=32 && charcode <=255){


				tmplength += sizedict[charcode];
			} else {
				tmplength += sizedict[77];
			}
	}
}
return tmplength;

}

// first pass on the BOMs to compute the position of each items
export function Computelayout(TBOM: BOM[]): BOM[] {
	const h:number=vscode.workspace.getConfiguration('bomarkdown').get('h')||20;
	const panv:number=vscode.workspace.getConfiguration('bomarkdown').get('panv')||20;
	const gap: number=vscode.workspace.getConfiguration('bomarkdown').get('gap')||2;
	const panh:number=vscode.workspace.getConfiguration('bomarkdown').get('panh')||20;
	const iconw:number=h;

	for (const iBOM of TBOM) {
		// premier scan de toute un bom pour determiner les abcisses de chaque item, la largeur de chaque item
		let itemcount = 0;
		for (const BOMitem of iBOM.BoMItems) {
			BOMitem.y = itemcount * (h + panv);
			BOMitem.x = BOMitem.level * panh;
			//todo le support du multiligne dans la description
			BOMitem.h = h;
			BOMitem.lblw = ComputeBBOXjson("system-ui", 13, BOMitem.Label);
			BOMitem.w = BOMitem.x + BOMitem.lblw;
			if (BOMitem.Type) { BOMitem.w += iconw + gap; }
			if (BOMitem.effectivity) {
				BOMitem.effw = ComputeBBOXjson("system-ui", 13, BOMitem.effectivity);
				if (BOMitem.effw > iBOM.maxnegw) { iBOM.maxnegw = BOMitem.effw; }
			}
			if (BOMitem.revision) { BOMitem.w += iconw + gap; }
			if (BOMitem.status) { BOMitem.w += iconw + gap; }
			if (BOMitem.w > iBOM.maxw) { iBOM.maxw = BOMitem.w; }
			itemcount++;
		}
		iBOM.y = 2*panv;
		iBOM.x = panh + iBOM.maxnegw;
		if (iBOM.column > 0) {
			iBOM.x = iBOM.x + panh + TBOM[iBOM.column - 1].x + TBOM[iBOM.column - 1].maxw;
		}

	}
	return TBOM;
}

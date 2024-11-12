import { BOM, h, panh, iconw, topoffset } from "./extension";
import FontSizes from "./IconConfig/Fontsize.json";
import * as vscode from 'vscode';
export const panv:number=vscode.workspace.getConfiguration('bomarkdown').get('panv')||20;
const gap: number=vscode.workspace.getConfiguration('bomarkdown').get('gap')||2;

interface fsize {
	[key:number]:number;
}

function ComputeBBOXjson (font:string, size:number, str:string):number{
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





export function Computelayout(TBOM: BOM[]): BOM[] {

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
		iBOM.y = topoffset;
		iBOM.x = panh + iBOM.maxnegw;
		if (iBOM.column > 0) {
			iBOM.x = iBOM.x + panh + TBOM[iBOM.column - 1].x + TBOM[iBOM.column - 1].maxw;
		}

	}
	return TBOM;
}

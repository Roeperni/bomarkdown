import { BOM,emphasis,BoMItem,BOMdata,fontsettings,legend,Icon,legendtable,Linksdefinitions,ObjsettingWlabel,legenditem,legendColumn, fontdef } from "./extension";
import FontSizes from "../IconConfig/Fontsize.json";
import * as vscode from 'vscode';
import { stringify } from "querystring";

// interface used for the font size
interface fsize {
	[key:number]:number;
}

export function initlegendbloc2 (legenditems:legenditem[],estnbcol:number,totalw:number,h:number):legendtable{

	
	const panv:number=vscode.workspace.getConfiguration('bomarkdown').get('panv')||20;
	const legendscale:number=vscode.workspace.getConfiguration('bomarkdown').get('legendscale')||0.7;
	const iconw:number=h;
	const gap: number=vscode.workspace.getConfiguration('bomarkdown').get('gap')||2;
	const maxi:number=legenditems.length
	if (estnbcol<0){

		let i:number=0;
		let tempw:number=legenditems[i].w;
		
		 do {
			tempw+=legenditems[i].w
			i++

		}while (tempw < totalw && i<maxi )
		estnbcol=i+1;
	}

	const maxitempercolum:number=Math.ceil(maxi/estnbcol);
	const nbcol:number=Math.ceil(maxi/maxitempercolum);
	let tempcolumns:legendColumn[]=[];
	let templegend:legendtable;
	let slicestart:number=0;
	let tempcolumnitems:legenditem[];
	
	for (let k=0;k<nbcol;k++){
		
			tempcolumnitems=legenditems.slice(slicestart,slicestart+maxitempercolum);
			slicestart+=maxitempercolum;

		let tempcolumn:legendColumn={x:0,w:0,items:[]};
		if (k==0){
			tempcolumn.x=0;
		}else{
			tempcolumn.x=tempcolumns[k-1].x + tempcolumns[k-1].w;
		}
		tempcolumn.w=Math.max(...tempcolumnitems.map(w =>w.w))+iconw+ 3* gap;
		tempcolumn.items=tempcolumnitems;
		tempcolumns.push(tempcolumn)
	}

	const tempw:number=tempcolumns[nbcol-1].x + tempcolumns[nbcol-1].w;

	templegend={w:tempw,h:(maxitempercolum)*(h+panv),columns:tempcolumns};



	return templegend;
}



function labelparser(Bomitem:BoMItem,emphasises:emphasis[]):BoMItem{
	Bomitem.lblw=ComputeBBOXjson("system-ui", 13,Bomitem.Label)
	for (let emph of emphasises){
		const re:RegExp=new RegExp(emph.regex,"g")
		const matched=Bomitem.Label.match(re);
		if (matched){
		for (let m of matched){
			const replacer=`<tspan font-weight="${emph.weight}" font-style="${emph.style}" ${emph.svgparam}>${m.replaceAll(emph.expression,"")}</tspan>`;
			Bomitem.Label=Bomitem.Label.replace(m,replacer);
			Bomitem.lblw-=ComputeBBOXjson("system-ui", 13,m);
			Bomitem.lblw+=ComputeBBOXjson("system-ui", 13,m,emph.style,emph.weight);

		}
	}

	}

	return Bomitem;
}

// fuction that computes a bbobx size using a string and a font definition
export function ComputeBBOXjson (font:string, size:number, str:string,style:string="normal",weight:string="normal"):number{
	let tmplength:number=0;
	const Fontobj=FontSizes.find(f => f.Font==font && f.size==size && f.style==style && f.weight==weight);
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
return Math.round(tmplength);

}

// first pass on the BOMs to compute the position of each items
export function Computelayout(TBOM: BOM[],emphasises:emphasis[]): BOM[] {
	const h:number=vscode.workspace.getConfiguration('bomarkdown').get('h')||20;
	const panv:number=vscode.workspace.getConfiguration('bomarkdown').get('panv')||20;
	const gap: number=vscode.workspace.getConfiguration('bomarkdown').get('gap')||2;
	const panh:number=vscode.workspace.getConfiguration('bomarkdown').get('panh')||20;
	const iconw:number=h;

	for (const iBOM of TBOM) {
		// premier scan de toute un bom pour determiner les abcisses de chaque item, la largeur de chaque item
		let itemcount = 0;
		for (let BOMitem of iBOM.BoMItems) {
			BOMitem=labelparser(BOMitem,emphasises);
			BOMitem.y = itemcount * (h + panv);
			BOMitem.x = BOMitem.level * panh;
			//todo le support du multiligne dans la description
			BOMitem.h = h;
			// label width is now in the labelparser
			//BOMitem.lblw = ComputeBBOXjson("system-ui", 13, BOMitem.Label);
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
		
		if (iBOM.column > 0) {
			iBOM.x = iBOM.x + panh + TBOM[iBOM.column - 1].x + TBOM[iBOM.column - 1].maxw;
		} else {
			iBOM.x = panh + iBOM.maxnegw;
		}

	}
	return TBOM;
}

export function Computelayout2(BomTable: BOMdata): BOM[] {

	const panv:number=vscode.workspace.getConfiguration('bomarkdown').get('panv')||20;
	const gap: number=vscode.workspace.getConfiguration('bomarkdown').get('gap')||2;
	const panh:number=vscode.workspace.getConfiguration('bomarkdown').get('panh')||20;
	
	let BendFactor:number=vscode.workspace.getConfiguration('bomarkdown').get('bend')||1;
	const emptyfontdef:fontdef={font_family:"",font_weight:"", font_style:"",font_size:"",stroke:"",stroke_width:"",fill:"",paint_order:""};
	//let fontdefs:fontsettings=vscode.workspace.getConfiguration('bomarkdown').get('fontdefs')||{	eff:{"font-family":"","font-weight":"", "font-style":"","font-size":"","stroke":"","stroke-width":"","fill":"","paint-order":""},label:{"font-family":"","font-weight":"", "font-style":"","font-size":"","stroke":"","stroke-width":"","fill":"","paint-order":""},linklabel:{"font-family":"","font-weight":"", "font-style":"","font-size":"","stroke":"","stroke-width":"","fill":"","paint-order":""},	rev:{"font-family":"","font-weight":"", "font-style":"","font-size":"","stroke":"","stroke-width":"","fill":"","paint-order":""}};
	let fontdefs:fontsettings=vscode.workspace.getConfiguration('bomarkdown').get('fontdefs')||{eff:emptyfontdef,rev:emptyfontdef,label:emptyfontdef,legend:emptyfontdef,linklabel:emptyfontdef};
	const h:number=Math.round(+fontdefs.label.font_size*4/3);
	const iconw:number=Math.round(+fontdefs.label.font_size*4/3);
  if ("bend" in BomTable.params){
	BendFactor=BomTable.params.bend;
  }

	for (const iBOM of BomTable.BOMs) {
		// premier scan de toute un bom pour determiner les abcisses de chaque item, la largeur de chaque item
		let itemcount = 0;

		for (let i=0; i< iBOM.BoMItems.length;i++) {
			if (i==0){
				iBOM.BoMItems[i].y = 0;
			} else {
				iBOM.BoMItems[i].y = iBOM.BoMItems[i-1].y+ iBOM.BoMItems[i-1].h+panv;
			}
			
			iBOM.BoMItems[i].x = iBOM.BoMItems[i].level * panh;
			iBOM.BoMItems[i].h = Math.round(+fontdefs.label.font_size*4/3);
			
			iBOM.BoMItems[i].w = iBOM.BoMItems[i].x + iBOM.BoMItems[i].lblw;
			if (iBOM.BoMItems[i].Type) { iBOM.BoMItems[i].w += iconw + gap; }
			let tempeffw=iBOM.BoMItems[i].effw;
			if (tempeffw) {
				
				if ((tempeffw-iBOM.BoMItems[i].x) > iBOM.maxnegw) { iBOM.maxnegw = tempeffw-iBOM.BoMItems[i].x; }
			}
			if (iBOM.BoMItems[i].revision) { iBOM.BoMItems[i].w += iconw + gap; }
			if (iBOM.BoMItems[i].status) { iBOM.BoMItems[i].w += iconw + gap; }
			if ((iBOM.BoMItems[i].w+iBOM.BoMItems[i].x) > iBOM.maxw) { iBOM.maxw = iBOM.BoMItems[i].w+iBOM.BoMItems[i].x; }
			itemcount++;
		}
		iBOM.y = 2*panv;
		
		if (iBOM.column > 0) {
			iBOM.x = iBOM.maxnegw+ panh + BomTable.BOMs[iBOM.column - 1].x + BomTable.BOMs[iBOM.column - 1].maxw;
		} else {
			iBOM.x = panh + iBOM.maxnegw;
		}

	}
	for (const iBOM of BomTable.BOMs) {
		// Deuxieme scan de toute un bom pour determiner coordonnées des lien d'implément des des labels
		for (const BoMItem of iBOM.BoMItems){
						if (BoMItem.relatives){
							
							for (const relative of BoMItem.relatives){

								// Boucle sur toutes les bom
								for (const bom of BomTable.BOMs){
								let relbomitem: BoMItem|undefined=bom.BoMItems.find( R=>R.alias===relative.relative);
								if (relbomitem!==undefined){
									if (bom.column==iBOM.column){
										// meme colonne 
										// attention piege le w le x du bord droit de l'item
										relative.geom.spx=iBOM.x+BoMItem.w+gap;
										relative.geom.spy=iBOM.y+BoMItem.y+h/2;
										relative.geom.fpx=bom.x+relbomitem.w+gap;
										relative.geom.fpy=bom.y+relbomitem.y+h/2;
										relative.geom.cs=(iBOM.maxw-BoMItem.w)*BendFactor+ panh;
										relative.geom.cf=(iBOM.maxw-relbomitem.w)*BendFactor + panh ;
										
			
			
									} else if (bom.column<iBOM.column){
										// cible a gauche
										// attention piege le w le x du bord droit de l'item
										relative.geom.spx=iBOM.x+BoMItem.x-panh/2;
										relative.geom.spy=iBOM.y+BoMItem.y+h/2;
										relative.geom.fpx=bom.x+relbomitem.w+gap;
										relative.geom.fpy=bom.y+relbomitem.y+h/2;
										relative.geom.cs=-(relative.geom.spx-relative.geom.fpx)/2;
										relative.geom.cf=-relative.geom.cs;
			
									} else{
										// cible à droite
										// attention piege le w le x du bord droit de l'item
										relative.geom.spx=iBOM.x+BoMItem.w+gap;
										relative.geom.spy=iBOM.y+BoMItem.y+h/2;
										relative.geom.fpx=bom.x+relbomitem.x-panh/2;
										relative.geom.fpy=bom.y+relbomitem.y+h/2;
										relative.geom.cs=(relative.geom.fpx-relative.geom.spx)/2;
										relative.geom.cf=-relative.geom.cs;
									}

							}
							}
							
						}
			
			
			
			
					}

		}

	}




	return BomTable.BOMs;
}

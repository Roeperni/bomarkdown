import { BOM,emphasis,BoMItem,BOMdata,fontsettings,legend,Icon,legendtable,Linksdefinitions,ObjsettingWlabel,legenditem,legendColumn, fontdef, link } from "./extension";
import * as vscode from 'vscode';


// interface used for the font size
interface fsize {
	[key:number]:number;
}

export function initlegendbloc2 (legenditems:legenditem[],estnbcol:number,totalw:number,h:number):legendtable{

	
	const panv:number=vscode.workspace.getConfiguration('bomarkdown').get('panv')||20;
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


export function Computelayout2(BomTable: BOMdata): BOM[] {

	
	const gap: number=vscode.workspace.getConfiguration('bomarkdown').get('gap')||2;
	const panh:number=vscode.workspace.getConfiguration('bomarkdown').get('panh')||20;
	
	let BendFactor:number=vscode.workspace.getConfiguration('bomarkdown').get('bend')||1;
	const emptyfontdef:fontdef={font_family:"",font_weight:"", font_style:"",font_size:"",stroke:"",stroke_width:"",fill:"",paint_order:""};
	//let fontdefs:fontsettings=vscode.workspace.getConfiguration('bomarkdown').get('fontdefs')||{	eff:{"font-family":"","font-weight":"", "font-style":"","font-size":"","stroke":"","stroke-width":"","fill":"","paint-order":""},label:{"font-family":"","font-weight":"", "font-style":"","font-size":"","stroke":"","stroke-width":"","fill":"","paint-order":""},linklabel:{"font-family":"","font-weight":"", "font-style":"","font-size":"","stroke":"","stroke-width":"","fill":"","paint-order":""},	rev:{"font-family":"","font-weight":"", "font-style":"","font-size":"","stroke":"","stroke-width":"","fill":"","paint-order":""}};
	let fontdefs:fontsettings=vscode.workspace.getConfiguration('bomarkdown').get('fontdefs')||new(fontsettings);
	let VpanFactor:number=vscode.workspace.getConfiguration('bomarkdown').get('vpanfactor')||4;
	
	const iconw:number=Math.round(+fontdefs.label.font_size*4/3);
  if ("bend" in BomTable.params){
	BendFactor=BomTable.params.bend;
  }
  if ("vpanfactor" in BomTable.params){
	VpanFactor=BomTable.params.vpanfactor;
  }

	for (const iBOM of BomTable.BOMs) {
		// premier scan de toute un bom pour determiner les abcisses de chaque item, la largeur de chaque item
		let itemcount = 0;
		if (iBOM.BoMItems.length>0){
		for (let i=0; i< iBOM.BoMItems.length;i++) {
			if (i==0){
				iBOM.BoMItems[i].y = 0;
				
			} else {
				iBOM.BoMItems[i].y = iBOM.h+iBOM.BoMItems[i].Label.h/VpanFactor;
			}
			iBOM.h=iBOM.BoMItems[i].y+iBOM.BoMItems[i].Label.h
			
			iBOM.BoMItems[i].x = iBOM.BoMItems[i].level * panh;
			iBOM.BoMItems[i].h = 100;
			iBOM.BoMItems[i].w = iBOM.BoMItems[i].x + iBOM.BoMItems[i].Label.w;
			if (iBOM.BoMItems[i].Type) { iBOM.BoMItems[i].w += iconw + gap; }
			
			if (iBOM.BoMItems[i].effectivity) {
				const tempeffw=iBOM.BoMItems[i].effectivity?.w||0;
				if ((tempeffw-iBOM.BoMItems[i].x) > iBOM.maxnegw) { iBOM.maxnegw = tempeffw-iBOM.BoMItems[i].x; }
			}
			if (iBOM.BoMItems[i].revision) { iBOM.BoMItems[i].w += iconw + gap; }
			if (iBOM.BoMItems[i].status) { iBOM.BoMItems[i].w += iconw + gap; }
			if (iBOM.BoMItems[i].tags){
				iBOM.BoMItems[i].w +=iBOM.BoMItems[i].tags?.reduce((sum,current)=>sum+gap+current.Ltag.w,0)||0;
			}
			if ((iBOM.BoMItems[i].w+iBOM.BoMItems[i].x) > iBOM.maxw) { iBOM.maxw = iBOM.BoMItems[i].w+iBOM.BoMItems[i].x; }
			itemcount++;
		}
		iBOM.y = 2*iBOM.BoMItems[0].Label.h/2;
		}
		
		
		if (iBOM.column > 0) {
			iBOM.x += iBOM.maxnegw+ panh + BomTable.BOMs[iBOM.column - 1].x + BomTable.BOMs[iBOM.column - 1].maxw;
		} else {
			iBOM.x = panh + iBOM.maxnegw;
		}

	}
	for (const iBOM of BomTable.BOMs) {
		if (iBOM.BoMItems.length>0){
		// Deuxieme scan de toute un bom pour determiner coordonnées des lien d'implément des des labels
		for (const BoMItem of iBOM.BoMItems){
			
						if (BoMItem.relatives){
							
							for (var relative of BoMItem.relatives){

								// Boucle sur toutes les bom
								for (const bom of BomTable.BOMs){
								let relbomitem: BoMItem|undefined=bom.BoMItems.find( R=>R.alias===relative.relative);
								if (relbomitem!==undefined){
									if (bom.column==iBOM.column){
										// meme colonne 
										// attention piege le w le x du bord droit de l'item
										relative.geom.spx=iBOM.x+BoMItem.w+gap;
										relative.geom.spy=iBOM.y+BoMItem.y+BoMItem.Label.h/2;
										relative.geom.fpx=bom.x+relbomitem.w+gap;
										relative.geom.fpy=bom.y+relbomitem.y+BoMItem.Label.h/2;
										relative.geom.cs=(iBOM.maxw-BoMItem.w)*BendFactor+ panh;
										relative.geom.cf=(iBOM.maxw-relbomitem.w)*BendFactor + panh ;
										relative=LinklabelCompute(relative,0,panh,iBOM.maxw+iBOM.x)
										
			
			
									} else if (bom.column<iBOM.column){
										// cible a gauche
										// attention piege le w le x du bord droit de l'item
										relative.geom.spx=iBOM.x+BoMItem.x-panh/2;
										relative.geom.spy=iBOM.y+BoMItem.y+BoMItem.Label.h/2;
										relative.geom.fpx=bom.x+relbomitem.w+gap;
										relative.geom.fpy=bom.y+relbomitem.y+BoMItem.Label.h/2;
										relative.geom.cs=-(relative.geom.spx-relative.geom.fpx)/2;
										relative.geom.cf=-relative.geom.cs;
										relative=LinklabelCompute(relative,1,panh,iBOM.maxw+iBOM.x)
			
									} else{
										// cible à droite
										// attention piege le w le x du bord droit de l'item
										relative.geom.spx=iBOM.x+BoMItem.w+gap;
										relative.geom.spy=iBOM.y+BoMItem.y+BoMItem.Label.h/2;
										relative.geom.fpx=bom.x+relbomitem.x-panh/2;
										relative.geom.fpy=bom.y+relbomitem.y+BoMItem.Label.h/2;
										relative.geom.cs=(relative.geom.fpx-relative.geom.spx)/2;
										relative.geom.cf=-relative.geom.cs;
										relative=LinklabelCompute(relative,2,panh,iBOM.maxw+iBOM.x)
									}

							}
							}
							
						}
			
			
			
			
					}

		}
	}

	}




	return BomTable.BOMs;
}

function LinklabelCompute (templink:link,targetpos:number,clearance:number,maxw:number):link{
	// targetpos same 0 , 1 left ,2 right
	let aliasposcode:number;
	switch (templink.aliaspos){
		case "m":
			aliasposcode=0;

			break;
		case "b":
			aliasposcode=1;

			break;
		case "e":
		default:
			aliasposcode=2;
			break;
	}
	const linkcomb:number=aliasposcode+3*targetpos
	switch (linkcomb){
		// label au mileu quelque soit la target
		case 0:
			templink.label_x=maxw;
			templink.label_y=(templink.geom.fpy-templink.geom.spy)/2+templink.geom.spy;
			templink.label_align="middle";
			templink.label_box_x=templink.label_x-templink.linklabel.w/2
			break;
		case 3:
		case 6:
			templink.label_x=(templink.geom.fpx-templink.geom.spx)/2+templink.geom.spx;
			templink.label_y=(templink.geom.fpy-templink.geom.spy)/2+templink.geom.spy;
			templink.label_align="middle";
			templink.label_box_x=templink.label_x-templink.linklabel.w/2
			break;

		// label au debut  meme col	
		case 1:
			templink.label_x=templink.geom.spx+ clearance;
			templink.label_y=templink.geom.spy;
			templink.label_align="begin";
			templink.label_box_x=templink.label_x
			break;
		// label a la fin meme col
		case 2:
			templink.label_x=templink.geom.fpx+ clearance;
			templink.label_y=templink.geom.fpy;
			templink.label_align="begin";
			templink.label_box_x=templink.label_x
			break;
		// label debut col gauche
		case 4:
			templink.label_x=templink.geom.spx- clearance;
			templink.label_y=templink.geom.spy;
			templink.label_align="end";
			templink.label_box_x=templink.label_x-templink.linklabel.w
			break;
		// label fin col gauche
		case 5:
			templink.label_x=templink.geom.fpx+ clearance;
			templink.label_y=templink.geom.fpy;
			templink.label_align="begin";
			templink.label_box_x=templink.label_x
			break;
		// label debut col droite
		case 7:
			templink.label_x=templink.geom.spx+ clearance;
			templink.label_y=templink.geom.spy;
			templink.label_align="begin";
			templink.label_box_x=templink.label_x
			break;
		// label fin col droite
		case 8:
			templink.label_x=templink.geom.fpx- clearance;
			templink.label_y=templink.geom.fpy;
			templink.label_align="end";
			templink.label_box_x=templink.label_x-templink.linklabel.w
			break;
	}

	return templink
}
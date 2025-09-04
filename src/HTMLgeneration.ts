import * as vscode from 'vscode';
import * as fs from 'fs';
import {Icon,BOM,SVGRectPresentation,BoMItem,extlog,Objsetting,ObjsettingWlabel,BOMdata,blocdelim,fontdef,fontsettings,FondeftoString,legendtable} from "./extension";
import {ReplacewithObject, Transcoder} from "./parseEditor"




interface Linksdefinitions {
	[key:string]:Linksdefinition

}
interface Linksdefinition {
	label:"string";
	arrow:"string";
	Color: "string";
	thickness:number;
	dashpattern:"string";
}









function getBOMCommandsB64(jsonpath:string):string{
    const gap: number=vscode.workspace.getConfiguration('bomarkdown').get('gap')||2;
	const h:number=vscode.workspace.getConfiguration('bomarkdown').get('h')||20;
	let rawdata = fs.readFileSync(jsonpath,"utf-8");
	let icons:Icon[] = JSON.parse(rawdata);
	let commands:string=`

<svg width="90%" height="${icons.length*(h+gap)}px" style="background-color:white" xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink">	
`;
	let nbicon:number=0;
	for (const icon of icons){
		commands+=`<g transform="translate(0,${nbicon*(h+gap)})">
		<text font-family="system-ui" font-weight="bold" font-style="normal" font-size="13" x="25" y="15"
     fill="black">
     ${icon.name} ${icon.label==undefined?"":`: <tspan  font-weight="normal" font-style="italic"> ${icon.label}</tspan>`}
    </text>
	<image  xlink:href="${icon.icon}" witdh="20" height="20" x="0" y="0"/>
	</g>
	`
	nbicon++;
	}

	return commands + "</svg>"
}



// Function to generate the HTML of the command BOM Command
export function generateCommandHTML(jsonpaths:string[]):string {
    const Status_Settings:ObjsettingWlabel=vscode.workspace.getConfiguration('bomarkdown').get('satus')||{};
    const MandatoryDefs_Settings:Objsetting=vscode.workspace.getConfiguration('bomarkdown').get('MandatoryDefs')||{};
    const bubbles_Settings:ObjsettingWlabel=vscode.workspace.getConfiguration('bomarkdown').get('bubbles')||{};
    const gap: number=vscode.workspace.getConfiguration('bomarkdown').get('gap')||2;
	const linkstyle:Linksdefinitions=vscode.workspace.getConfiguration('bomarkdown').get('Linksdefinition')||{};
	const h:number=vscode.workspace.getConfiguration('bomarkdown').get('h')||20;
	const blocdelim: blocdelim=vscode.workspace.getConfiguration('bomarkdown').get('codeblockdelimiter')||{"begin":"","end":""};
	const iconw:number=h;

    let comandhtml:string=`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
* {
  box-sizing: border-box;
}
.column {
  float: left;
  padding: 1px;
  }

.left {
  width: 50%;
}

.right {
  width: 50%;
}

/* Clear floats after the columns */
.row:after {
  content: "";
  display: table;
  clear: both;
}
</style>
<title>BOM markdown commands</title>
</head>
<body>
<h2>Bom Markdown Commands</h2>    
<div class="row">
  <div class="column left" >
	<h3>Block delimiter</h3>
	<table>
  <tr>
    <th>begin</th>
    <th>end</th>
  </tr>
	`;
	const tablebegin=blocdelim.begin.split(" ");
	const tablefin=blocdelim.end.split(" ")
	for (let i=0;i<tablebegin.length;i++){
		comandhtml+=`<tr>
			<td><code> ${ReplacewithObject({"<":"&lt;",">":"&gt;"},tablebegin[i])} </code> </td>
			<td> <code> ${ReplacewithObject({"<":"&lt;",">":"&gt;"},tablefin[i])}</code></td>
		</tr>`
	}
	comandhtml+=`
	</table>
    <h3>Icons</h3>
`;
    for (let jsonpath of jsonpaths){
		comandhtml+=`<h4>${jsonpath}</h4>
		`;

    		comandhtml+=getBOMCommandsB64(jsonpath);
		
	}

    comandhtml+=`
  </div>
  <div class="column right" >
    <h3>Mandatory Defs</h3>
    <svg width="90%" height="${h+2*gap}px" style="background-color:white" xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink">
    ${MandatoryDefs_Settings["undef"]}
    <text font-family="system-ui" font-weight="bold" font-style="normal" font-size="13" x="${iconw+gap}" y="15"
				fill="black">
				Undef
				</text>			
    </svg>
    `;
	comandhtml+=`<h3>Links</h3>
    ${generateSVGforLinks(linkstyle,gap,true)}
    `;

    comandhtml+=`<h3>Satus Defs</h3>
    ${generateSVGforSetting(Status_Settings,gap,"",true)}
    `;
    comandhtml+=`<h3>Bulle Defs</h3>
    ${generateSVGforSetting(bubbles_Settings,gap+3,MandatoryDefs_Settings["placeholder"],true)}
    `;


    
    // fermeture des DIV
    comandhtml+="</svg></div></div></body></html>";
    return comandhtml;

}

function generateSVGforSetting (obj:ObjsettingWlabel,gap:number,includesvg?:string,svgheader?:boolean):string{
	const h:number=vscode.workspace.getConfiguration('bomarkdown').get('h')||20;
	const iconw:number=h;
    let comandhtml:string="";
    if (svgheader){
    comandhtml=`<svg width="90%" height="${Object.keys(obj).length*(h+2*gap)+gap}px" style="background-color:white" xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink">
    `;
    }
    let nbkey:number=0;
    for (let key in obj){
        comandhtml+=`<g transform="translate(15,${gap+nbkey*(h+2*gap)})">
        ${includesvg}
        ${obj[key].svg}
        <text font-family="system-ui" font-weight="bold" font-style="normal" font-size="13" x="${iconw+gap}" y="15" fill="black">
				${key} ${obj[key].label==undefined?"":`: <tspan  font-weight="normal" font-style="italic"> ${obj[key].label}</tspan>`}
				</text>
                
        </g>`;
        nbkey ++; 
    }
    return comandhtml+ "</svg>"
}

function generateSVGforLinks (obj:Linksdefinitions,gap:number,svgheader?:boolean):string{
	const h:number=vscode.workspace.getConfiguration('bomarkdown').get('h')||20;
	const iconw:number=h;
    let comandhtml:string="";
    if (svgheader){
    comandhtml=`<svg width="90%" height="${Object.keys(obj).length*(h+2*gap)+gap}px" style="background-color:white" xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink">
    `;
    }
    let nbkey:number=0;
	comandhtml+=`<defs>
	${Extractarrows(obj)}
	</defs>`;
    for (let key in obj){
        comandhtml+=`<g transform="translate(15,${gap+nbkey*(h+2*gap)})">
        <line x1="0" y1="${h/2}" x2="${iconw}" y2="${h/2}" ${lineproperties(obj[key],key)} stroke-linecap="round"/>
        <text font-family="system-ui" font-weight="bold" font-style="normal" font-size="13" x="${iconw+gap}" y="15" fill="black">
			${key} ${obj[key].label==undefined?"":`: <tspan  font-weight="normal" font-style="italic"> ${obj[key].label}</tspan>`}
				</text>
                
        </g>`;
        nbkey ++; 
    }
    return comandhtml+ "</svg>"
}



function ExtractDefFromObject (obj:Objsetting):string{
    let comandhtml:string="";
    for (let key in obj){
        comandhtml+=`${obj[key]}
        `;
         }
    return comandhtml
}

function ExtractDefFromObjectWlabel (obj:ObjsettingWlabel):string{
    let comandhtml:string="";
    for (let key in obj){
        comandhtml+=`${obj[key].svg}
        `;
         }
    return comandhtml
}

function Extractarrows (linkstyle:Linksdefinitions):string {
	let comandhtml:string="";
	for (let key in linkstyle){
		if (linkstyle[key].arrow){
		comandhtml+=`${linkstyle[key].arrow}
        `;}
	}
	return comandhtml
}

function lineproperties (link:Linksdefinition,key:string):string {
	let templineprop:string=`stroke="${link.Color}" stroke-width="${link.thickness}"`;
	if (link.dashpattern){templineprop+=' stroke-dasharray="'+link.dashpattern +'"'};
	if (link.arrow){templineprop+=' marker-end="url(#arrow_'+key +')"'};
	return templineprop;

}



export function generateSVG2(contexturi:vscode.Uri ,BOMdata:BOMdata,legendeblock:legendtable):string{
	//const h:number=vscode.workspace.getConfiguration('bomarkdown').get('h')||20;
	const revisionstyle:SVGRectPresentation= vscode.workspace.getConfiguration('bomarkdown').get('revisionstyle')||new(SVGRectPresentation);
	const panh:number=vscode.workspace.getConfiguration('bomarkdown').get('panh')||20;
	const panv:number=vscode.workspace.getConfiguration('bomarkdown').get('panv')||20;
	
    const gap: number=vscode.workspace.getConfiguration('bomarkdown').get('gap')||2;
    const Status_Settings:ObjsettingWlabel=vscode.workspace.getConfiguration('bomarkdown').get('satus')||{};
    const MandatoryDefs_Settings:Objsetting=vscode.workspace.getConfiguration('bomarkdown').get('MandatoryDefs')||{};
    const bubbles_Settings:ObjsettingWlabel=vscode.workspace.getConfiguration('bomarkdown').get('bubbles')||{};
	const linkstyle:Linksdefinitions=vscode.workspace.getConfiguration('bomarkdown').get('Linksdefinition')||{};
	let haslegend:boolean=vscode.workspace.getConfiguration('bomarkdown').get('renderlegend')||true;
	let verbose:boolean=false;
	let iconJSONS:string[]=vscode.workspace.getConfiguration('bomarkdown').get('IconJson')||[];
		const emptyfontdef:fontdef={font_family:"",font_weight:"", font_style:"",font_size:"",stroke:"",stroke_width:"",fill:"",paint_order:""};
		//let fontdefs:fontsettings=vscode.workspace.getConfiguration('bomarkdown').get('fontdefs')||{	eff:{"font-family":"","font-weight":"", "font-style":"","font-size":"","stroke":"","stroke-width":"","fill":"","paint-order":""},label:{"font-family":"","font-weight":"", "font-style":"","font-size":"","stroke":"","stroke-width":"","fill":"","paint-order":""},linklabel:{"font-family":"","font-weight":"", "font-style":"","font-size":"","stroke":"","stroke-width":"","fill":"","paint-order":""},	rev:{"font-family":"","font-weight":"", "font-style":"","font-size":"","stroke":"","stroke-width":"","fill":"","paint-order":""}};
		let fontdefs:fontsettings=vscode.workspace.getConfiguration('bomarkdown').get('fontdefs')||{eff:emptyfontdef,rev:emptyfontdef,label:emptyfontdef,legend:emptyfontdef,linklabel:emptyfontdef};
	
	const h:number=Math.round(Number(fontdefs.label.font_size)*4/3);
	const hl:number=Math.round(Number(fontdefs.legend.font_size)*4/3);
	const iconw:number=h;
	if ("haslegend" in BOMdata.params){
		haslegend=BOMdata.params.haslegend;
	}

	let tempfinItem:number=0;
	// load all the icons from all the files
	if ("IconJsons" in BOMdata.params) {
		iconJSONS=BOMdata.params.iconJSONS;
	} 

	let icons:Icon[]=[];
	for (let Iconjson of iconJSONS){
		if (Iconjson=="[embedded]"){

			Iconjson=vscode.Uri.joinPath(contexturi,"IconConfig","DefaultIcons.json").fsPath
			}
	
		let rawdata = fs.readFileSync(Iconjson,"utf-8");
		icons.push(...JSON.parse(rawdata));

	}

	//fontdefs.rev['font-size']=Math.round(+fontdefs.label['font-size']*10/13).toString();

	if ("verbose" in BOMdata.params){extlog.appendLine('Icon charged');}
	// calcul de la taille du graph
	// pourquoi un at(-1) fait du undefined ?
	const totalw=BOMdata.BOMs[BOMdata.BOMs.length-1].x + BOMdata.BOMs[BOMdata.BOMs.length-1].maxw;
	const maxitem= Math.max(...BOMdata.BOMs.map((maxitem)=>maxitem.BoMItems.length),0);
	
	// extraction de la legende
	let svgh:number;
	if (haslegend){
		svgh=maxitem*(h+panv)+2*panv+legendeblock.h+20;
	} else {
		svgh=maxitem*(h+panv)+2*panv;
	}
	if ("verbose" in BOMdata.params){extlog.appendLine('legend computed');}
	// Init du svg et ouverture des <def>
	let tempstr:string=`<svg width="${totalw+panh}" height="${ svgh }" style="background-color:white" xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink">
	<defs>
	`;
    // recuperation des def des settings
	tempstr+=Extractarrows(linkstyle);
	tempstr+=ExtractDefFromObject(MandatoryDefs_Settings);
    tempstr+=ExtractDefFromObjectWlabel(Status_Settings);
    tempstr+=ExtractDefFromObjectWlabel(bubbles_Settings);


	// extraction des différents type pour le mettre dans le def du svg
	let listtype:string[]=[];
	for (const bom of BOMdata.BOMs) {
		let listtypperbom=bom.BoMItems.map(item=> item.Type).filter((value,index,self)=>self.indexOf(value) ===index);
		listtype=listtype.concat(listtypperbom);
	}
	let UniqueType:string[]=listtype.filter((value,index,array)=>array.indexOf(value)===index);
	extlog.appendLine("liste des types : "+UniqueType.join(","));

	// creation d'un def pour chaque type
	for (const typ of UniqueType){
		const typeicon =icons.find(i =>i.name==typ);
		if (typeicon !==undefined){
			tempstr+=`<image  id="${typ}" witdh="${h}" height="${h}" x="0" y="0" preserveAspectRatio="xMinYMid" xlink:href="${typeicon.icon}"/>
			`;
		} 

	}
	
	// Fermeture des <def>
	tempstr+=`</defs> 
	`;
	if ("verbose" in BOMdata.params){extlog.appendLine('Def defined');}
// creation de la legende
if (haslegend){
	// scale(${legendscale},${legendscale})
	tempstr+=`<g id="legend" transform="translate(${gap},${maxitem*(h+panv)+panv})"> 
	<rect width="${legendeblock.w +2*gap}" height="${legendeblock.h + panv}" x="0" y="12" fill="none" stroke="gray" stroke-width="1"/>
	<g transform="translate(5,${panv+hl})">		
	`;
	for (const c of legendeblock.columns){
		let nbi:number=0;
		for (const i of c.items) {
			switch (i.type){

				case "object":
					tempstr+=`<use  href="#${i.name}" x="0" y="0" transform="translate(${c.x},${nbi*(hl+panv)}) scale(${hl/18},${hl/18})"/>
					`;
					break;

				case "status":
					tempstr+=`<use  href="#${i.name}" x="0" y="0" transform="translate(${c.x},${nbi*(hl+panv)}) scale(${hl/18},${hl/18})"/>
					`;
					break;
				case "link" :
					tempstr+=`<line x1="${c.x}" y1="${nbi*(hl+panv)+hl/2}" x2="${c.x+hl}" y2="${nbi*(hl+panv)+hl/2}" ${lineproperties(linkstyle[i.name],i.name)} stroke-linecap="round"/>
					`;
					break;
				case "bubble":
					// use 20 here because 20 is the basic size of def in the settings
					tempstr+=`<use  href="#placeholder" x="0" y="0" transform="translate(${c.x},${nbi*(hl+panv)}) scale(${hl/18},${hl/18})"/>
					<use  href="#${i.name}" x="0" y="0" transform="translate(${c.x},${nbi*(hl+panv)}) scale(${hl/18},${hl/18})"/>
					`;

					break;
				

			}




			tempstr+=`<text ${FondeftoString(fontdefs.legend)} x="${c.x+hl+gap}" y="${nbi*(hl+panv)+hl/2}" dominant-baseline="middle">
					${i.label}
					</text>`;
			nbi++;

		}
	}
	tempstr+=`</g>
	<rect x="18" y="10" width="45" height="5" fill="white"/>
	<text ${FondeftoString(fontdefs.legend)} x="20" y="16" >
	Legend
	</text></g>`;
	if ("verbose" in BOMdata.params){extlog.appendLine('legend inserted');}
}


// première boucle pour la creation des liens
	for (const iBOM of BOMdata.BOMs){
		for (const BoMItem of iBOM.BoMItems){
			// construction des lien parent / enfant on le fait en premier pour avoir les bulles sur les liens
			if (BoMItem.Parentid>=0){
				const papa: BoMItem|undefined=iBOM.BoMItems.find(B => B.id===BoMItem.Parentid);
				if (papa !==undefined){
					tempstr+=`<polyline fill="none" ${lineproperties(linkstyle[BoMItem.parent_link_type],BoMItem.parent_link_type)} points="${papa.x+iBOM.x+h/2},${papa.y+iBOM.y+papa.h} ${papa.x+iBOM.x+h/2},${BoMItem.y+iBOM.y+BoMItem.h/2} ${BoMItem.x+iBOM.x},${BoMItem.y+iBOM.y+BoMItem.h/2}"/>
					`;
				}
			}
			// contruction des liens d'implément
			if (BoMItem.relatives){
				
				for (const relative of BoMItem.relatives){
					// test if the linktype is known

						if (relative.linktype in linkstyle){
						tempstr+=`<path fill="none" ${lineproperties(linkstyle[relative.linktype],relative.linktype)} d="M ${relative.geom.spx} ${relative.geom.spy} C ${relative.geom.spx+relative.geom.cs} ${relative.geom.spy} ${relative.geom.fpx+relative.geom.cf} ${relative.geom.fpy} ${relative.geom.fpx} ${relative.geom.fpy}"/>
						`;
					}
				}
				}
			}




		}
		if ("verbose" in BOMdata.params){extlog.appendLine('Relationned');}
	

// Deuxieme boucle pour la creation des items au dessus des liens
	for (const iBOM of BOMdata.BOMs){
		for (const BoMItem of iBOM.BoMItems){
			// Constrution du group avec le label
			tempstr+=`
			<g id="${BoMItem.id}" transform="translate(${BoMItem.x+iBOM.x},${BoMItem.y+iBOM.y})">
			`;
			// test de presence d'un type et de sa validite
			if (BoMItem.Type){
				const typeicon :any|undefined=icons.find(i =>i.name==BoMItem.Type);
				// on fait de la place pour l'icone si il y a un type
				tempstr+=`<rect width="${BoMItem.lblw}" height="${h}" x="${iconw+gap}" fill="url(#grad)" />
				<text id="${"L_"+BoMItem.id}" x="${iconw+gap}" ${FondeftoString(fontdefs.label)} y="${Math.ceil(h/2)}" dominant-baseline="middle">
				${BoMItem.Label}
				</text>
				`;
                // il y a 2 gap ici car un entre l'icon et le texte et un autre apres
				tempfinItem=BoMItem.lblw+iconw+2*gap;
                // insertion de l'icone via un def
				if (typeicon !==undefined){
                    tempstr+=`<use  href="#${BoMItem.Type}" x="0" y="0"/>
					`;
				} else{
					tempstr+=`<use href="#undef" x="0" y="0"/>
					`;
				}
				
			} else {
				// si pas de type pas d'icone
				tempstr+=`<rect width="${BoMItem.lblw}" height="${h}" x="${gap}" fill="url(#grad)" />
				<text id="${"L_"+BoMItem.id}" ${FondeftoString(fontdefs.label)}x="${gap}" y="${Math.ceil(h/2)}" dominant-baseline="middle">
				${BoMItem.Label}
				</text>
				`;

				tempfinItem=BoMItem.lblw+gap;
			}

			// rendu de l'effectivité
			if (BoMItem.effectivity){
				if (BoMItem.effectivity=="o"){
					tempstr+=`<use href="#eff" x="0" y="0"/>
					`;
				} else {
					tempstr+=`<rect width="${BoMItem.effw}" height="${h}" x="${-panh-(BoMItem.effw || 0)}" fill="url(#grad)" />
					<text id="${"e_"+BoMItem.id}" ${FondeftoString(fontdefs.eff)}x="${-panh}" y="${Math.ceil(h/2)}" dominant-baseline="middle" text-anchor="end">
    				${BoMItem.effectivity}
    				</text>
					`;
				}
				}
			// traimetment des bulles
			if(BoMItem.bubbles){
				for (const b of BoMItem.bubbles){
					tempstr+=`<use href="#${b}" x="0" y="0" transform="scale(${iconw/20},${iconw/20})"/>
					`;
				}
			}
			// revision
			if (BoMItem.revision){
				const half_revsize:number=Math.round(h*0.45)
				tempstr+=`<rect ${FondeftoString(revisionstyle)}x="${tempfinItem}" y="${Math.round(h/2-half_revsize)}" width="${2*half_revsize}" height="${2*half_revsize}" rx="${h/5}"/>
				<text ${FondeftoString(fontdefs.rev)}textLength="${h-5}" dominant-baseline="middle" text-anchor="middle" x="${tempfinItem+half_revsize}" y="${Math.ceil(h/2)}" >
				${BoMItem.revision} 
				</text>
				`;
				tempfinItem+=h+gap;
			}
			// status
			if (BoMItem.status){
				tempstr+=`<use href="#${BoMItem.status}" transform="translate(${tempfinItem},0) scale(${iconw/20},${iconw/20})" />
				`;

				tempfinItem+=iconw+gap;


				
			}
			// fermeture du groupe
			tempstr+=`</g>
			`;
			// rendu des label des liens
			if (BoMItem.relatives){
				
				for (const relative of BoMItem.relatives){
					// test if the linktype is known

						if (relative.linktype in linkstyle){
						const labelfont_h:number=Math.round(+fontdefs.linklabel.font_size*4/3);
						var stringdef:string=FondeftoString(fontdefs.linklabel).replace("LinkColor",linkstyle[relative.linktype].Color);
						tempstr+=`<rect width="${relative.linklblw}" height="${labelfont_h}" x="${relative.label_box_x}" y="${relative.label_y-labelfont_h/2}" fill="url(#grad)" />
						<text ${stringdef}x="${relative.label_x}" y="${relative.label_y}" dominant-baseline="middle" text-anchor="${relative.label_align}">
						${relative.linklabel}
						</text>
						`;
					}
				}
				}
				


		}
		if ("verbose" in BOMdata.params){extlog.appendLine('itemed');}
	}

	return tempstr + '</svg>'
}

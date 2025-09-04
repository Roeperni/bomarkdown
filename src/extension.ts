// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { Computelayout2,initlegendbloc2} from './Computelayout';
import { parseEditor,legendextract,Parselegendbloc} from './parseEditor';
import { generateCommandHTML, generateSVG2 } from './HTMLgeneration';
import { buffer } from 'stream/consumers';

let bboxservice: vscode.WebviewPanel | undefined = undefined;
let previewpanel: vscode.WebviewPanel | undefined = undefined;



export class SVGRectPresentation {
	stroke:string="none";
	stroke_width:string="0.25";
	stroke_linejoin:string="round";
	fill:string="grey";
	fill_opacity:string="1";

}

// courbure des lien d'implement
export let extlog = vscode.window.createOutputChannel("BoMarkdownLogs");
//Define Item interface
export type linkgeom = {
spx:number;
spy:number;
fpx:number;
fpy:number;
cf:number;
cs:number;
}

export type legendtable ={
	w:number;
	h:number;
	columns:legendColumn[];
}


 export type legendColumn ={
		x:number;
		w:number;
		items:legenditem[];
}


export interface Linksdefinitions {
	[key:string]:Linksdefinition

}
export interface Linksdefinition {
	label:"string";
	arrow:"string";
	Color: "string";
	thickness:number;
	dashpattern:"string";
}


export interface legend {
	types:string[];
	links:string[];
	status:string[];
	bubbles:string[];
}

export type legenditem ={
		type:string;
		name:string;
		label:string;
		w:number;
}

export type link = {
	relative: string;
	linktype: string;
	linklabel: string;
	linklblw: number;
	aliaspos: string;
	label_x: number;
	label_y: number;
	label_align:string;
	label_box_x:number
	geom:linkgeom;
}

export type emphasis = {
	regex: string;
	expression: string;
	svgparam: string;
	style: string;
	weight: string
}

export class BoMItem {
	id: number=0;
	Parentid: number=-1;
	level: number=0;
	Type: string="";
	Label: string="";
	alias?: string;
	x: number=0;
	y: number=0;
	h: number=0;
	w: number=0;
	parent_link_type:string="h";
	lblw: number=0;
	effw?: number;
	effectivity?: string;
	status?: string;
	revision?: string;
	bubbles?: string[];
	relatives?: link[];
	badparsing: boolean=true;
}
export class BOM {
	BoMItems: BoMItem[]=[];
	column: number=0;
	x: number=0;
	y: number=0;
	maxw: number=0;
	maxnegw: number=0;
	h: number=0;

}

export interface Objsetting {
	[key: string]: any;
}

export interface ObjsettingWlabel {
	[key: string]: {
		svg: string;
		label: string;
	};
}

export interface BOMdata {
	BOMs: BOM[];
	path: string;
	Duri: string;
	params: Objsetting;
}

export interface Implink {
	spx: number;
	spy: number;
	fpx: number;
	fpy: number;
	cf: number;
	cs: number;
}


export type blocdelim = {
	"begin": string;
	"end": string;
}

export class fontdef {
	font_family:string="sytem-ui";
	font_weight:string="normal"; 
	font_style:string="normal"; 
	font_size:string="12";
	stroke:string="none"; 
	stroke_width:string="0";
	fill:string="black";
	paint_order:string="stroke";
}

export class fontsettings {
	label:fontdef=new(fontdef);
	rev:fontdef=new(fontdef);
	eff:fontdef=new(fontdef);
	linklabel:fontdef=new(fontdef);
	legend:fontdef=new(fontdef);
}

export interface Icon {

	"name": string;
	"icon": string;
	"type": string;
	"filename": string;
	"source"?: string;
	"label"?: string;
}

interface BoMBLock {
	"path": string;
	"content": string;
	"begin": number;
	"end": number
}

export function FondeftoString (fontdef: fontdef|SVGRectPresentation):string {
	// Function that transform a dict into a string key1="value1" key2="value2"
	let tempstr:string="";
	//Object.entries(fontdef).forEach(([key,value])=>tempstr+=`${key}="${value}" `);
	for (const[key,value] of Object.entries(fontdef)){

			tempstr+=`${key.replace("_","-")}="${value}" `
		
	}
	return tempstr
}

export function Fondefsizecompute(fontdefs:fontsettings,defsize:number):fontsettings{
	// function to conpute fontsize from fontdefs
	let def:keyof fontsettings;
	let tempfontdefs:fontsettings=fontdefs;
	for (def in fontdefs){
		let tempfontdef:fontdef=fontdefs[def];
		tempfontdef.font_size=`${(Math.round(Number(tempfontdef.font_size)*defsize))}`;
		tempfontdefs[def]=tempfontdef;
	}
	return tempfontdefs;
}


function QPIfromTable(table: string[], exturi: vscode.Uri, preselect: boolean): vscode.QuickPickItem[] {
	// generate quick pick item from a table
	let tempitemtable: vscode.QuickPickItem[] = []

	for (let item of table) {
		let tempqpi: vscode.QuickPickItem = { label: "", picked: preselect }
		if (item == "[embedded]") {
			tempqpi.label = item
			tempqpi.description = vscode.Uri.joinPath(exturi, "IconConfig", "DefaultIcons.json").fsPath
		} else {
			tempqpi.label = item.substring(item.lastIndexOf("\\") + 1)
			tempqpi.description = item

		}
		tempitemtable.push(tempqpi)
	}

	return tempitemtable

}



function B64slicer(str: string, size: number): string[] {
	//experimental fucntion to slice B64 
	const numChunks = Math.ceil(str.length / size)
	const chunks = new Array(numChunks)
	let start: number = 0;
	for (let i = 0; i < numChunks; i++) {
		chunks[i] = str.substring(start, start + size)
		start += size;
	}

	return chunks
}





function getBomBlock(line: number, editortext: string): BoMBLock {
// function to extract a bommardown bom from a markdown document 
	// Split de l'editor sur les saut de line
	let EditorArray: string[] = editortext.split(/\r?\n/);
	const blocdelim: blocdelim = vscode.workspace.getConfiguration('bomarkdown').get('codeblockdelimiter') || { "begin": "", "end": "" };
	const beginbloc = blocdelim.begin.split(" ");
	const endbloc = blocdelim.end.split(" ");
	// recherche de la limite sup du codeblock
	let i = 0;
	let beginline = 0;
	let temppath: string[] = [];
	for (i = line; i >= 0; i--) {
		//console.log("Ligne:" + EditorArray[i] + " Bloc:" + beginbloc[0]);
		if (beginbloc.some(bloc => EditorArray[i].startsWith(bloc))) {
			temppath = EditorArray[i].split(" ");
			//console.log("trouvé debut");
			beginline = i + 1;
			break;

		}
	}

	for (i = line; i < EditorArray.length; i++) {
		console.log(endbloc.toString())
		if (endbloc.some(fbloc => EditorArray[i].startsWith(fbloc))) {
			console.log("trouvé fin");
			break;
		}
	}
	const endline = i;
	const tempblock: BoMBLock = { "path": temppath[1], "content": EditorArray.slice(beginline, endline).join("\n"), "begin": beginline, "end": endline };
	return tempblock;
}

function createsvgfile(uri: vscode.Uri, path: string, txtsvg: string): void {
	//create a svg file from a string containing a svg code
	let tempuri:vscode.Uri;
	if (uri.scheme != "untitled") {
		if (path) {
			
			tempuri=vscode.Uri.joinPath(uri, "../");
			tempuri=vscode.Uri.joinPath(tempuri,path+".svg");
		} else {

			tempuri = uri.with({ path: uri.path.substring(0, uri.path.lastIndexOf(".")) + ".svg" });
		}
		vscode.workspace.fs.writeFile(tempuri, Buffer.from(txtsvg, "utf-8"));
		vscode.window.showInformationMessage('File created : ' + uri.toString());
	} else {
		vscode.window.showInformationMessage('File is not saved no svg creation');
	}
}


 function CreateRenditionWebView(ctx:vscode.ExtensionContext):vscode.WebviewPanel{
	//create the webview used for rendition , also define the handler for commands
				bboxservice = vscode.window.createWebviewPanel(
					'BBoxservice',
					'BBoxservice',
					{preserveFocus:true,viewColumn:vscode.ViewColumn.Two},
					
					{
						enableScripts: true,
						retainContextWhenHidden: true
					}
				);
				bboxservice.webview.html = getBBoxWebview(ctx.extensionUri, bboxservice.webview);
				bboxservice.onDidDispose(
					() => {
						bboxservice = undefined;
					},
					undefined,
					ctx.subscriptions
				);
			
			// Get message from the BBOX service.
			bboxservice.webview.onDidReceiveMessage(
				message => {
											
						let fontdefs:fontsettings=vscode.workspace.getConfiguration('bomarkdown').get('fontdefs')||new(fontsettings);
						
							let BOMtable:BOMdata = message.boms;
							let BOMuri:vscode.Uri=vscode.Uri.file(BOMtable.Duri);
							let legenditems= message.legenditems;
							let legendcolumns:number=3;
							if ("verbose" in BOMtable.params) { vscode.window.showInformationMessage('Layouted'); }
							if ("legendcolumns" in BOMtable.params){ legendcolumns=BOMtable.params.legendcolumns}
							BOMtable.BOMs=Computelayout2(BOMtable);
							const totalw=BOMtable.BOMs[BOMtable.BOMs.length-1].x + BOMtable.BOMs[BOMtable.BOMs.length-1].maxw;
							const h:number=Math.round(Number(fontdefs.legend.font_size)*4/3);
							let legendeblock=initlegendbloc2(legenditems,legendcolumns,totalw,h);
							const svgcode=generateSVG2(ctx.extensionUri, BOMtable,legendeblock);
							let Editor = vscode.window.activeTextEditor;
							



					switch (message.context) {
						case 'preview': {

							// Create and show a new webview
							if (!previewpanel) {

								previewpanel = vscode.window.createWebviewPanel(
									'previewpanel',
									'previewpanel',
									vscode.ViewColumn.Two,
									{
										retainContextWhenHidden: true
									}
								);
								previewpanel.onDidDispose(
									() => {
										previewpanel = undefined;
									},
									undefined,
									ctx.subscriptions
								);
							}
							
							previewpanel.webview.html = `<!DOCTYPE html>
				<html lang="en">
				<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>BoM Preview</title>
				</head>
				<body>
				<h1>SVG</h1>
				${svgcode}
				<h1>Json</h1>
				<p>
				<pre>
				<code>
				${JSON.stringify(BOMtable, null, "\t")}
				</code>
				</pre>
				</p>
				<p>
				<pre>
				<code>
				${JSON.stringify(legenditems, null, "\t")}
				</code>
				</pre>
				</p>
				</body>
				</html>`;


							break;
						}
						case 'gensvg':{
						

								createsvgfile(BOMuri, BOMtable.path, svgcode)

						}
						case 'insertsvg':{
							if (Editor!==undefined){
								const editortext = Editor.document.getText();
								let temptxtbloc = getBomBlock(Editor.selection.active.line, editortext);
								createsvgfile(BOMuri, BOMtable.path, svgcode);
								const temposition: vscode.Position = new vscode.Position(temptxtbloc.end + 1, 0);
								const tempSVGmd = `![${temptxtbloc.path}](${temptxtbloc.path + ".svg"} "${temptxtbloc.path}")`;
								if (!editortext.includes(tempSVGmd)) {
									Editor.edit(editbuilder => {
										editbuilder.insert(temposition, "\n" + tempSVGmd + "\n");

									});
								}
								vscode.commands.executeCommand('markdown-preview-enhanced.openPreviewToTheSide');

							}
						}
					}
				},
				undefined,
				ctx.subscriptions
			);

			return bboxservice;
}





// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "bomarkdown" is now active!');

	// open rendering view
	context.subscriptions.push(
		vscode.commands.registerCommand('bomarkdown.BBoxservice', () => {
			if (!bboxservice) {
				
				bboxservice = CreateRenditionWebView(context)
			}
		})
	);

	// Preview current bom and display json
	context.subscriptions.push(
		vscode.commands.registerCommand('bomarkdown.NewPreview', () => {

			let Editor = vscode.window.activeTextEditor
			if (Editor === undefined) {
				vscode.window.showInformationMessage('No Active editor');
			} else {
				// Export to file
				if (!bboxservice) {
					bboxservice=CreateRenditionWebView(context);

			}


				const editortext = Editor.document.getText();
				let temptxtbloc = getBomBlock(Editor.selection.active.line, editortext);
				let BOMtable: BOMdata = parseEditor(temptxtbloc.content,temptxtbloc.path,Editor.document.uri);

				let emphasis: emphasis[] = vscode.workspace.getConfiguration('bomarkdown').get('emphasis') || [];
				
				const emptyfontdef:fontdef={font_family:"",font_weight:"", font_style:"",font_size:"",stroke:"",stroke_width:"",fill:"",paint_order:""};
				//let fontdefs:fontsettings=vscode.workspace.getConfiguration('bomarkdown').get('fontdefs')||{	eff:{"font-family":"","font-weight":"", "font-style":"","font-size":"","stroke":"","stroke-width":"","fill":"","paint-order":""},label:{"font-family":"","font-weight":"", "font-style":"","font-size":"","stroke":"","stroke-width":"","fill":"","paint-order":""},linklabel:{"font-family":"","font-weight":"", "font-style":"","font-size":"","stroke":"","stroke-width":"","fill":"","paint-order":""},	rev:{"font-family":"","font-weight":"", "font-style":"","font-size":"","stroke":"","stroke-width":"","fill":"","paint-order":""}};
				let fontdefs:fontsettings=vscode.workspace.getConfiguration('bomarkdown').get('fontdefs')||{eff:emptyfontdef,rev:emptyfontdef,label:emptyfontdef,legend:emptyfontdef,linklabel:emptyfontdef};

				

				
				let iconJSONS:string[]=vscode.workspace.getConfiguration('bomarkdown').get('IconJson')||[];
					if ("IconJsons" in BOMtable.params) {
					iconJSONS=BOMtable.params.iconJSONS;
					} 
					let icons:Icon[]=[];
			for (let Iconjson of iconJSONS){
				if (Iconjson=="[embedded]"){

					Iconjson=vscode.Uri.joinPath(context.extensionUri,"IconConfig","DefaultIcons.json").fsPath
					}
			
		let rawdata = fs.readFileSync(Iconjson,"utf-8");
		icons.push(...JSON.parse(rawdata));

	}

				if ("emphasis" in BOMtable.params) { emphasis = BOMtable.params.emphasis }
				const legende:legend=legendextract(BOMtable.BOMs);
				let legenditems:legenditem[]=Parselegendbloc(legende,icons)
				bboxservice.webview.postMessage({ command: 'getbboxes',context:"preview", boms: BOMtable, fontdefs: fontdefs,emphasises:emphasis,legenditems:legenditems });


			}


		})
	);

	// Generate a SVG and insert it in the current md doc 
	context.subscriptions.push(
		vscode.commands.registerCommand('bomarkdown.NewInsert', () => {

			let Editor = vscode.window.activeTextEditor
			if (Editor === undefined) {
				vscode.window.showInformationMessage('No Active editor');
			} else {
				// Export to file
				if (!bboxservice) {
					bboxservice=CreateRenditionWebView(context);

			}


				const editortext = Editor.document.getText();
				let temptxtbloc = getBomBlock(Editor.selection.active.line, editortext);
				let BOMtable: BOMdata = parseEditor(temptxtbloc.content,temptxtbloc.path,Editor.document.uri);
				
				let emphasis: emphasis[] = vscode.workspace.getConfiguration('bomarkdown').get('emphasis') || [];
				
				const emptyfontdef:fontdef={font_family:"",font_weight:"", font_style:"",font_size:"",stroke:"",stroke_width:"",fill:"",paint_order:""};
	//let fontdefs:fontsettings=vscode.workspace.getConfiguration('bomarkdown').get('fontdefs')||{	eff:{"font-family":"","font-weight":"", "font-style":"","font-size":"","stroke":"","stroke-width":"","fill":"","paint-order":""},label:{"font-family":"","font-weight":"", "font-style":"","font-size":"","stroke":"","stroke-width":"","fill":"","paint-order":""},linklabel:{"font-family":"","font-weight":"", "font-style":"","font-size":"","stroke":"","stroke-width":"","fill":"","paint-order":""},	rev:{"font-family":"","font-weight":"", "font-style":"","font-size":"","stroke":"","stroke-width":"","fill":"","paint-order":""}};
				let fontdefs:fontsettings=vscode.workspace.getConfiguration('bomarkdown').get('fontdefs')||{eff:emptyfontdef,rev:emptyfontdef,label:emptyfontdef,legend:emptyfontdef,linklabel:emptyfontdef};

				
				
				let iconJSONS:string[]=vscode.workspace.getConfiguration('bomarkdown').get('IconJson')||[];
					if ("IconJsons" in BOMtable.params) {
					iconJSONS=BOMtable.params.iconJSONS;
					} 
					let icons:Icon[]=[];
			for (let Iconjson of iconJSONS){
				if (Iconjson=="[embedded]"){

					Iconjson=vscode.Uri.joinPath(context.extensionUri,"IconConfig","DefaultIcons.json").fsPath
					}
			
		let rawdata = fs.readFileSync(Iconjson,"utf-8");
		icons.push(...JSON.parse(rawdata));

	}

				if ("emphasis" in BOMtable.params) { emphasis = BOMtable.params.emphasis }
				const legende:legend=legendextract(BOMtable.BOMs);
				let legenditems:legenditem[]=Parselegendbloc(legende,icons)
				bboxservice.webview.postMessage({ command: 'getbboxes',context:"insertsvg", boms: BOMtable, fontdefs: fontdefs,emphasises:emphasis,legenditems:legenditems });


			}
		})
	);
	// export the current bom into a svg file
	context.subscriptions.push(
		vscode.commands.registerCommand('bomarkdown.NewXport', () => {

			let Editor = vscode.window.activeTextEditor
			if (Editor === undefined) {
				vscode.window.showInformationMessage('No Active editor');
			} else {
				// Export to file
				if (!bboxservice) {
					bboxservice=CreateRenditionWebView(context);

			}


				const editortext = Editor.document.getText();
				let temptxtbloc = getBomBlock(Editor.selection.active.line, editortext);
				let BOMtable: BOMdata = parseEditor(temptxtbloc.content,temptxtbloc.path,Editor.document.uri);
				
				let emphasis: emphasis[] = vscode.workspace.getConfiguration('bomarkdown').get('emphasis') || [];
				
				const emptyfontdef:fontdef={font_family:"",font_weight:"", font_style:"",font_size:"",stroke:"",stroke_width:"",fill:"",paint_order:""};
	//let fontdefs:fontsettings=vscode.workspace.getConfiguration('bomarkdown').get('fontdefs')||{	eff:{"font-family":"","font-weight":"", "font-style":"","font-size":"","stroke":"","stroke-width":"","fill":"","paint-order":""},label:{"font-family":"","font-weight":"", "font-style":"","font-size":"","stroke":"","stroke-width":"","fill":"","paint-order":""},linklabel:{"font-family":"","font-weight":"", "font-style":"","font-size":"","stroke":"","stroke-width":"","fill":"","paint-order":""},	rev:{"font-family":"","font-weight":"", "font-style":"","font-size":"","stroke":"","stroke-width":"","fill":"","paint-order":""}};
				let fontdefs:fontsettings=vscode.workspace.getConfiguration('bomarkdown').get('fontdefs')||{eff:emptyfontdef,rev:emptyfontdef,label:emptyfontdef,legend:emptyfontdef,linklabel:emptyfontdef};

				
				
				let iconJSONS:string[]=vscode.workspace.getConfiguration('bomarkdown').get('IconJson')||[];
					if ("IconJsons" in BOMtable.params) {
					iconJSONS=BOMtable.params.iconJSONS;
					} 
					let icons:Icon[]=[];
			for (let Iconjson of iconJSONS){
				if (Iconjson=="[embedded]"){

					Iconjson=vscode.Uri.joinPath(context.extensionUri,"IconConfig","DefaultIcons.json").fsPath
					}
			
		let rawdata = fs.readFileSync(Iconjson,"utf-8");
		icons.push(...JSON.parse(rawdata));

	}

				if ("emphasis" in BOMtable.params) { emphasis = BOMtable.params.emphasis }
				const legende:legend=legendextract(BOMtable.BOMs);
				let legenditems:legenditem[]=Parselegendbloc(legende,icons)
				bboxservice.webview.postMessage({ command: 'getbboxes',context:"gensvg", boms: BOMtable, fontdefs: fontdefs,emphasises:emphasis,legenditems:legenditems });


			}
		})
	);

	// show commands 
	context.subscriptions.push(
		vscode.commands.registerCommand('bomarkdown.commands', async () => {

			// Create and show a new webview
			const panel = vscode.window.createWebviewPanel(
				'bomcommands', // Identifies the type of the webview. Used internally
				'BoM Markdown Commands', // Title of the panel displayed to the user
				vscode.ViewColumn.Two, // Editor column to show the new webview panel in.
				{} // Webview options. More on these later.
			);
			let iconJSONS: string[] = vscode.workspace.getConfiguration('bomarkdown').get('IconJson') || [];
			let selectedJsons = await vscode.window.showQuickPick(QPIfromTable(iconJSONS, context.extensionUri, true),
				{ placeHolder: 'Select to Json to display', canPickMany: true });

			if (selectedJsons !== undefined) {
				let selectedjsonpath: string[] = [];
				for (let selectedjson of selectedJsons) {
					if (selectedjson.description) {
						selectedjsonpath.push(selectedjson.description)
					}
				}
				panel.webview.html = generateCommandHTML(selectedjsonpath);

			}

		})
	);
	// edit icons
	context.subscriptions.push(
		vscode.commands.registerCommand('bomarkdown.editusericon', async () => {
			let iconJSONS: string[] = vscode.workspace.getConfiguration('bomarkdown').get('IconJson') || [];
			let selectedJson = await vscode.window.showQuickPick(QPIfromTable(iconJSONS, context.extensionUri, false),
				{ placeHolder: 'Select to Json to display', canPickMany: false });
			// search if embedded json icon is still thee
			if (selectedJson?.description) {

				vscode.workspace.openTextDocument(vscode.Uri.file(selectedJson.description)).then(doc => {
					vscode.window.showTextDocument(doc, vscode.ViewColumn.Two);
				});

			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('bomarkdown.addicons', () => {

			// option for the folder picker
			const options: vscode.OpenDialogOptions = {
				canSelectMany: false,
				openLabel: 'Select',
				canSelectFiles: false,
				canSelectFolders: true
			};
			let iconJSONS: string[] = vscode.workspace.getConfiguration('bomarkdown').get('IconJson') || [];
			let icons: Icon[] = [];

			// diplay of the file dialog
			vscode.window.showOpenDialog(options).then(fileUri => {
				if (fileUri && fileUri[0]) {
					// Jsonpath
					const jsonpath: string = fileUri[0].fsPath + "_Icons.json"
					extlog.appendLine("liste des types :" + fileUri[0].fsPath);
					// read the folder
					// load the json if it exists 
					if (fs.existsSync(jsonpath)) {
						let rawdata = fs.readFileSync(jsonpath, "utf-8");
						icons = JSON.parse(rawdata);

					}


					extlog.appendLine("Json Location :" + jsonpath);

					const IconFiles = fs.readdirSync(fileUri[0].fsPath)

					for (const Iconfile of IconFiles) {
						// extension detection
						const spitIconfile = Iconfile.split(".")
						if (spitIconfile[1].toLowerCase() == "jpg" || spitIconfile[1].toLowerCase() == "png" || spitIconfile[1].toLowerCase() == "jpeg") {
							const Iconindex = icons.findIndex(i => i.filename == Iconfile);
							extlog.appendLine(fileUri[0].fsPath + " | " + Iconfile);
							extlog.appendLine(path.join(fileUri[0].fsPath, Iconfile));
							// converstion of the file in B64
							let tempB64: string = fs.readFileSync(path.join(fileUri[0].fsPath, Iconfile), { encoding: 'base64' });
							//const tempB64sliced:string[]=B64slicer(tempB64,76);
							if (Iconindex > -1) {
								// If the icon is already in the index udate the image
								extlog.appendLine("Update :" + spitIconfile[0]);

								icons[Iconindex].icon = `data:image/${spitIconfile[1]};base64,${tempB64}`;
								//icons[Iconindex].iconsliced=tempB64sliced;

							} else {
								// new file add to index
								let tempicon: Icon = {
									filename: Iconfile,
									name: spitIconfile[0].toLowerCase().replace(" ", ""),
									label: spitIconfile[0].charAt(0).toUpperCase() + spitIconfile[0].slice(1),
									type: spitIconfile[1].toLowerCase(),
									icon: `data:image/${spitIconfile[1]};base64,${tempB64}`,
									//iconsliced:tempB64sliced


								};
								extlog.appendLine("Add :" + spitIconfile[0]);
								icons.push(tempicon)
							}
						}
					}
					// save the object in the json
					let rawdata2 = JSON.stringify(icons, null, 2);
					fs.writeFileSync(jsonpath, rawdata2);

					if (iconJSONS.find(i => i == jsonpath) == undefined) {
						iconJSONS.push(jsonpath)
						vscode.workspace.getConfiguration('bomarkdown').update("IconJson", iconJSONS, vscode.ConfigurationTarget.Global)
					}
					// display the new icons
					const panel = vscode.window.createWebviewPanel(
						'bomcommands', // Identifies the type of the webview. Used internally
						'BoM Markdown Updated Commands', // Title of the panel displayed to the user
						vscode.ViewColumn.Two, // Editor column to show the new webview panel in.
						{} // Webview options. More on these later.
					);
					const idembedded = iconJSONS.findIndex(i => i == "[embedded]");
					if (idembedded > -1) {
						iconJSONS[idembedded] = vscode.Uri.joinPath(context.extensionUri, "IconConfig", "DefaultIcons.json").fsPath;
					}

					panel.webview.html = generateCommandHTML(iconJSONS);


				}
			});



		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('bomarkdown.updatesnippets', async () => {
			let iconJSONS: string[] = vscode.workspace.getConfiguration('bomarkdown').get('IconJson') || [];
			const settingforsnippet = [
				{
					"settingname": "Linksdefinition",
					"body": "(l:${1|$LIST|}:$0"
				},
				{
					"settingname": "bubbles",
					"body": "(b:${1|$LIST|}$0"
				},
				{
					"settingname": "satus",
					"body": "(s:${1|$LIST|}$0"
				},
			];
			// load current Snippets
			const readsnippet = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(context.extensionUri, "snippets", "bomarkdownSnippets.json"));
			let snippet = JSON.parse(Buffer.from(readsnippet).toString('utf8'));
			// update snippets for bubble, status and linkdefinition
			for (let p of settingforsnippet) {
				const setting = vscode.workspace.getConfiguration('bomarkdown').get(p.settingname) || {};
				if (p.settingname in snippet) {
					snippet[p.settingname].body = p.body.replace("$LIST", Object.keys(setting).join(","))
				}

			}
			// get item jsons

			let icons: Icon[] = [];
			for (let Iconjson of iconJSONS) {
				if (Iconjson == "[embedded]") {

					Iconjson = vscode.Uri.joinPath(context.extensionUri, "IconConfig", "DefaultIcons.json").fsPath
				}

				let rawdata = fs.readFileSync(Iconjson, "utf-8");
				icons.push(...JSON.parse(rawdata));

			}
			// update the snippet
			snippet["item"].body = "(i:${1|" + icons.map(i => i.name).join(",") + "|},${2:Label},${3:Revision}";
			//update the json snippet
			vscode.workspace.fs.writeFile(vscode.Uri.joinPath(context.extensionUri, "snippets", "bomarkdownSnippets.json"), Buffer.from(JSON.stringify(snippet, null, "\t"), "utf8"))

			// reload workbench to take into account
			vscode.commands.executeCommand("workbench.action.reloadWindow");
			vscode.window.showInformationMessage("Snippets Updated");

		})
	);
}

// This method is called when your extension is deactivated
export function deactivate() { }




function getBBoxWebview(contexturi: vscode.Uri, wv: vscode.Webview) {
	// create the webview 
	const onDiskPath = vscode.Uri.joinPath(contexturi, 'IconConfig', 'bbox.js');

	// And get the special URI to use with the webview
	const Scriptpath = wv.asWebviewUri(onDiskPath);
	return `<html>
    <head> 
        <script type="text/javascript" src="${Scriptpath}"></script>
    </head>
    <body> 
        <svg>
            <text id="Textbox" font-family="system-ui" font-weight="normal" font-style="normal" font-size="13" x="22" y="15" stroke="white" stroke-width="0.25" fill="black" paint-order="stroke">
                Wesh <tspan font-weight="bold">les potos</tspan>
            </text>
        </svg>
    <p>   
     </p>
    </body>
</html>`;
}
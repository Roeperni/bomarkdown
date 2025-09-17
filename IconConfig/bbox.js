const vscode = acquireVsCodeApi();

function testtextbox(Ff,Fweight,Fstyle,Fsize,txt){
    var Txtbox=document.getElementById("Textbox");
    Txtbox.setAttribute ('font-family','system-ui');
    Txtbox.setAttribute ('fill','black');
    Txtbox.setAttribute ('font-weight',Fweight);
    Txtbox.setAttribute ('font-style',Fstyle);
    Txtbox.setAttribute ('font-size',Fsize);
    Txtbox.setAttribute ('stroke','white');
    Txtbox.setAttribute ('stroke-width','1');
    Txtbox.setAttribute ('paint-order',"stroke");
    window.alert(Txtbox.getBBox().width);

}

function emphparser(Label,emphasises){
    for (let emph of emphasises){
        const re=new RegExp(emph.regex,"g")
        const matched=Label.match(re);
        if (matched){
        for (let m of matched){
            const replacer=`<tspan font-weight="${emph.weight}" font-style="${emph.style}" ${emph.svgparam}>${m.replaceAll(emph.expression,"")}</tspan>`;
            Label=Label.replace(m,replacer);

        }
    }

    }

    return Label;
}

function getBBox (label,fontdefs){
    var Txtbox=document.getElementById("Textbox");
    Object.entries(fontdefs).forEach(([key,value])=>Txtbox.setAttribute (key.replace("_","-"),value));
    Txtbox.innerHTML=label.text;
    label.w=Math.round(Txtbox.getBBox().width);
    label.h=Math.round(Txtbox.getBBox().height);

    return label

}


   window.addEventListener('message', event => {

            let message = event.data; // The JSON data our extension sent
            
            switch (message.command) {
                case 'getbbox':
                    var Txtbox=document.getElementById("Textbox");
                    Txtbox.setAttribute ('font-size',message.payload.Fsize);
                    Txtbox.innerHTML=message.payload.txt
                    
                    vscode.postMessage({
                        command: 'Bbox',
                        result: Txtbox.getBBox().width
                    });
                    break;
                case 'getbboxes':
                    var Txtbox=document.getElementById("Textbox");
                    var response=message
                    for (let ibom of response.boms.BOMs){
                        for (let bomitem of ibom.BoMItems){
                            if (bomitem.Label) {
                            if (bomitem.parent_link_type=="-"){
                                bomitem.Label=getBBox(bomitem.Label,message.fontdefs.prop);
                            }else{
                                bomitem.Label=getBBox(bomitem.Label,message.fontdefs.label);
                            }
                            }
                            if (bomitem.tags){
                                for (var tag of bomitem.tags){

                                    tag.Ltag=getBBox(tag.Ltag,tag.font);
                                }
                            }
                            if (bomitem.effectivity){
                                
                                bomitem.effectivity=getBBox(bomitem.effectivity,message.fontdefs.eff);
                            }
                            if (bomitem.relatives){
                                for (let rel of bomitem.relatives){
                                    
                                    rel.linklabel=getBBox(rel.linklabel,message.fontdefs.linklabel);
                                }
                            }


                        }
                    }
                   
                    for (let legenditem of response.legenditems){
                        legenditem.w=Math.round(getBBox({text:legenditem.label,w:0,h:0},message.fontdefs.legend).w)
                    }

                    vscode.postMessage({
                        context: message.context,
                        boms: response.boms,
                        legenditems:response.legenditems
                    });
                    break;
            }
        });
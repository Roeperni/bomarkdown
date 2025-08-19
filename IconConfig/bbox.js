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
    Txtbox.innerHTML=label;
    return Txtbox.getBBox().width;

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
                            bomitem.Label=emphparser(bomitem.Label,message.emphasises);
                            bomitem.lblw=Math.round(getBBox(bomitem.Label,message.fontdefs.label));
                            
                            }
                            if (bomitem.effectivity){
                                bomitem.effectivity=emphparser(bomitem.effectivity,message.emphasises);
                                bomitem.effw=Math.round(getBBox(bomitem.effectivity,message.fontdefs.eff));
                            }
                            if (bomitem.relatives){
                                for (let rel of bomitem.relatives){
                                    rel.linklabel=emphparser(rel.linklabel,message.emphasises);
                                    rel.linklblw=Math.round(getBBox(rel.linklabel,message.fontdefs.linklabel));
                                }
                            }


                        }
                    }
                   
                    for (let legenditem of response.legenditems){
                        legenditem.w=Math.round(getBBox(legenditem.label,message.fontdefs.legend))
                    }

                    vscode.postMessage({
                        context: message.context,
                        boms: response.boms,
                        legenditems:response.legenditems
                    });
                    break;
            }
        });
// Models 
export const SVGSchemaURI =  "http://www.w3.org/2000/svg";
export interface Moveable {
    show():void;
    hide():void;
}
export abstract class Shape {
    width:number;
    height:number;
    x:number;
    y:number;
    color:string;
    classList:string[];
    _el:any;

    constructor (h:number, w:number, x:number, y:number, color?:string) {
        this.height = h;
        this.width = w;
        this.x = x;
        this.y = y;
        this.color = color || undefined;
        this.classList = [];
    }

    abstract createElement<T>():T;
    abstract update():void;

}

export class Rect extends Shape implements Moveable{
    value:number;

    constructor (h:number, w:number, x:number, y:number, color?:string) {
        super(h,w,x,y,color);
        this._el = this.createElement();
        this.update();
    }

    createElement ():SVGRectElement {
        return document.createElementNS(SVGSchemaURI,'rect');
    }

    update () {
        let element = <SVGRectElement> this._el;
        element.setAttribute("width", this.width.toString() + "%");
        element.setAttribute("height", this.height.toString());
        element.setAttribute("x", this.x.toString() + "%");
        element.setAttribute("y", this.y.toString());
        element.setAttribute("class","transition");
        let style = `fill:${this.color};`;
        if(this.color){
            element.setAttribute("style", style);
        }
        
        this.classList.forEach( (cls) =>{
            if(!element.classList.contains(cls)){
                element.classList.add(cls);
            }
        });
    }

    moveTo(percent:number){
        this._el.setAttribute("transform", `scale(${percent},1)`);
        this._el.style.transform = `scale3d(${percent},1,1)`;
        this._el.style.webkitTransform = `scale3d(${percent},1,1)`;
        this._el.style['-ms-transform'] = `scale3d(${percent},1,1)`;
        this.value = percent;
    }

    show(){
        this._el.classList.add("show");
    }
    hide(){
        this._el.classList.remove("show");
    }
}

export class Tooltip extends Shape implements Moveable{
    text:string;
    components:{
        text:SVGTextElement
    }
    
    constructor (h:number, w:number, x:number, y:number, text:string, color:string, css?:any) {
        super(h,w,x,y,color);
        this.text = text || "00:00:00";
        this.components = {
            text:null
        };
        this._el = this.createElement();
        
    }

    createElement():SVGGElement {
        let path:SVGPathElement = document.createElementNS(SVGSchemaURI, "path");
        path.setAttribute("d", `M${this.x} ${this.y} 
                                L${this.width + this.x} ${this.y} 
                                L${this.width + this.x} ${this.height + this.y} 
                                L${this.x + this.width / 2 + 7} ${this.height + this.y} 
                                L${this.x + this.width / 2} ${this.height + this.y + 7} 
                                L${this.x + this.width / 2 - 7 } ${this.height + this.y} 
                                L${this.x} ${this.height + this.y}`);
        let text:SVGTextElement = document.createElementNS(SVGSchemaURI, "text");
        text.textContent = this.text;
        text.setAttribute("x", `${this.x + this.width/2 - 30}`);
        text.setAttribute("y", `${this.y + this.height/2 + 5 }`);
        text.setAttribute("fill","rgba(0,0,0,.6)");
        this.components.text = text;
        let tooltip:SVGGElement = document.createElementNS(SVGSchemaURI, "g");
        tooltip.setAttribute("fill", `${this.color}`);
        tooltip.setAttribute("class", "transition tooltip");
        tooltip.appendChild(path);
        tooltip.appendChild(text);
        return tooltip;
    }

    private toTimeText(time:number):string {
        var sec_num     = time; // don't forget the second param
        var hours:any   = Math.floor(sec_num / 3600);
        var minutes:any = Math.floor((sec_num - (hours * 3600)) / 60);
        var seconds:any = sec_num - (hours * 3600) - (minutes * 60);
        seconds = parseInt(seconds, 10);
        if (hours   < 10) {hours   = "0"+ hours;}
        if (minutes < 10) {minutes = "0"+ minutes;}
        if (seconds < 10) {seconds = "0"+ seconds;}
        return hours+':'+minutes+':'+seconds;
    }
    show(){
        this._el.classList.add("show");
    }
    hide(){
        this._el.classList.remove("show");
    }
    moveTo(percent:number, time:number) {
        this._el.setAttribute("transform", `translate(${percent} 0)`);
        this._el.style.transform = `translate3d(${percent}px,0,0)`;
        this._el.style.webkitTransform = `translate3d(${percent}px,0,0)`;
        this.components.text.textContent = this.toTimeText(time);
    }
    update() {

    }
}

// <g fill="red">
//   <path fill="green" d="M0 0 L100 0 L100 50 L60 50 L50 60 L40 50 L0 50" />
// <text x="20" y="30" fill="#000000">00:11:44</text>
// </g>
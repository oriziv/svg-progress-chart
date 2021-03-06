import { ChartData, 
         ChartOptions, 
         ProgressBar, 
         ComponentTree, 
         Colors } from './interfaces';
import { Rect, Tooltip } from './models';
// import {Utils} from './utils';
// @TODO import function from Utils

// Define requestAnimationFrame with fallback
let requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
        window['webkitRequestAnimationFrame'] ||
        window['mozRequestAnimationFrame'] ||
        function (callback) {
            window.setTimeout(callback, 1000 / 60);
        };
})();

// Define the main class for the progress chart.
export class SVGProgressChart {
    id: string;
    rootElement: HTMLElement;
    components: ComponentTree;
    timer:number;
    lastMatch = false;
    currentTooltipType:string;    
    options: ChartOptions = {
        height: 500,
        width: 500,
        data: [],
        time: 0,
        tooltipHeight:30,
        barHeight:5,
        top:50
    };

    constructor(element:HTMLElement, options: ChartOptions) {
        if (!element) {
            throw "Root SVG Element is missing";
        }        
        this.rootElement = element;
        this.id = this.rootElement.id;

        if (options) {
            this.options.height = options.height;
            this.options.width = options.width || this.rootElement.parentElement.clientWidth;
            this.options.data = options.data;
            this.options.time = options.time;
            this.options.barHeight = options.barHeight || this.options.barHeight;
            this.options.tooltipHeight = options.tooltipHeight || 30;
            this.options.top = 20 + this.options.tooltipHeight;
        }
        this.rootElement.setAttribute("height", this.options.height.toString());
        this.rootElement.setAttribute("width", '100%');
        this.components = {
            progressBar: {
                bar: null,
                buffer: null,
                overlay: null,
                progress: null,
                tooltip: null
            },
            events: []
        };

        this.init();
    }

    addClass(cls:string) {
        if ( 'classList' in this.rootElement ) {
            this.rootElement.classList.add(cls);
        } else {
            this.rootElement.className = this.rootElement.className + ' ' + cls;
        }
    }

    private setBuffer(time: number) {
        time = Math.min(time, this.options.time);
        let that = this;
        let value;
        if (!time) {
            return;
        }
        value = Math.min(time / that.options.time * 100, that.options.time);
        requestAnimFrame(function () {
            that.components.progressBar.buffer.moveTo(value);
        });
    }
    
    public onSetProgress(callback:Function) {
        var instance = this;
        if(!callback) {
            return;
        }
        
        this.components.progressBar.overlay._el.addEventListener('click', function(e:MouseEvent){
            let percent = (e.offsetX / instance.options.width);
            let time = Math.round(percent * instance.options.time);
            callback(time);
        });
    }

    public setProgress(time: number) {
        time = Math.min(time, this.options.time);
        let that = this;
        let value;
        if (typeof time === 'undefined') {
            return;
        }
        value = Math.min(time / that.options.time * 100, that.options.time);
        requestAnimFrame(function () {
            that.components.progressBar.progress.moveTo(value);
        });

    }

    public setPreBuffer(time:number) {
        time = Math.min(time, this.options.time);
        let per = time / this.options.time;
        let pixels = per * this.options.width - this.components.progressBar.tooltip.width / 2;
        pixels = Math.max(Math.min(pixels, this.options.width - this.components.progressBar.tooltip.width), 0);

        this.components.progressBar.tooltip.show();
        this.components.progressBar.buffer.show();
        this.setBuffer(time);
        this.components.progressBar.tooltip.moveTo(pixels, time);

    }

    public clearEvents() {
        this.components.progressBar.overlay._el.removeEventListener('click', this.handleMouseClick.bind(this));
        this.components.progressBar.overlay._el.removeEventListener('mouseleave', this.handleMouseLeave.bind(this));
        this.components.progressBar.overlay._el.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    }

    public setData(data:ChartData[]) {
        
        // If new data obj less than what exists than delete data.
        if(data.length < this.components.events.length){
            this.components.events.forEach((e, i) => {
                if(i >= data.length) {
                    e.remove();
                }
            });
        }

        data.forEach((event, i) => {
            if(!event.x){
                event.x = i ? this.options.data[i - 1].x + this.options.data[i - 1].width : 0;
            }
            // If event created - just modify the props.
            if(this.components.events && this.components.events[i] && this.components.events[i]._el) {
                this.components.events[i].x = event.x;
                this.components.events[i].width = event.width;
                this.components.events[i].type = event.type || 'default';
                this.components.events[i].color = Colors[event.type || 'default'];
                this.components.events[i].update();
            } else{
                let newEvent = new Rect(this.options.barHeight * 2, event.width, event.x, 20 + this.options.tooltipHeight - 0.5* this.options.barHeight);
                newEvent.type = event.type;
                newEvent.addClass(event.type || 'default');
                this.components.events.push(newEvent);
                if(this.components.progressBar.overlay){
                    // prepend
                    this.components.progressBar.overlay._el.parentNode.insertBefore(newEvent._el, this.components.progressBar.overlay._el);
                } else{
                    this.rootElement.appendChild(newEvent._el);
                }
            }
        });

        
    }

    private handleMouseLeave(e: MouseEvent) {
        requestAnimFrame(()=>{
            this.components.progressBar.tooltip.hide();
            this.components.progressBar.buffer.hide();
        });
    }

    private handleMouseMove(e: MouseEvent) {
        let pixels = e.offsetX / this.options.width * this.options.width - this.components.progressBar.tooltip.width / 2;
        let time = e.offsetX / this.options.width * this.options.time;
        pixels = Math.max(Math.min(pixels, this.options.width - this.components.progressBar.tooltip.width), 0);
        
        clearTimeout(this.timer);

        this.timer = setTimeout(()=> {
        this.lastMatch = false;
        this.components.events.forEach(event => {
            if(!event._el) {
                return;
            }

            // if(event.hasClass('selected')){
            //     event.removeClass('selected');
            // }

            if(e.offsetX >= event.x * this.options.width/100 && e.offsetX < (event.x + event.width)/100 * this.options.width && event.type !== 'neutral') {
                this.lastMatch = true;
                if(event.type !== this.currentTooltipType){
                    requestAnimFrame(()=>{
                        // event.addClass('selected');
                        this.components.progressBar.tooltip.removeClass(this.currentTooltipType);
                        this.currentTooltipType = event.type;
                        this.components.progressBar.tooltip.addClass(event.type);
                    });
                } 
            }
        });

        if(!this.lastMatch) {
            this.components.progressBar.tooltip.removeClass(this.currentTooltipType);
            this.currentTooltipType = 'neutral';
        }

        }, 10);


        requestAnimFrame(()=> {
            this.setPreBuffer(time);
        });
    }

    private handleMouseClick(e: MouseEvent) {
        let percent = (e.offsetX / this.options.width * 100);
        requestAnimFrame(()=> {
            this.components.progressBar.progress.moveTo(percent);
        });        
    }

    private init() {
        let instance = this;
        // Create progress bar
        // 1. Create the bar element
        let bar = new Rect(this.options.barHeight, 100, 0, this.options.top);
        bar.addClass('bar');
        this.rootElement.appendChild(bar._el);
        this.components.progressBar.bar = bar;

        // 2. Create the progress element
        let progress = new Rect(this.options.barHeight, 1, 0, this.options.top);
        progress.addClass('progress');
        progress.moveTo(0);

        // 3. Create the dragging overlay progress
        let bufferProgress = new Rect(this.options.barHeight, 1, 0, this.options.top);
        this.rootElement.appendChild(bufferProgress._el);
        this.components.progressBar.buffer = bufferProgress;
        bufferProgress.addClass('buffer');
        bufferProgress.moveTo(0);

        this.rootElement.appendChild(progress._el);
        this.components.progressBar.progress = progress;
        console.log(this);

        // 4. Create timeline rects from data if exists
        if (this.options.data) {
            this.setData(this.options.data);
        }

        // 5. Create overlay on top of everything for catching events        
        let overlay = new Rect(this.options.barHeight * 3, 100, 0, 20 + this.options.tooltipHeight -  this.options.barHeight, "rgba(255,255,255,0)");
        overlay.addClass("overlay");
        this.components.progressBar.overlay = overlay;
        this.rootElement.appendChild(overlay._el);

        // 6. Create the tooltip
        let tooltip = new Tooltip(this.options.tooltipHeight, this.options.tooltipHeight * 2.2, 0, 0, "00:00:00");
        this.components.progressBar.tooltip = tooltip;
        this.rootElement.appendChild(tooltip._el);

        // Add event listeners
        overlay._el.addEventListener('click', this.handleMouseClick.bind(this));
        overlay._el.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        overlay._el.addEventListener('mousemove', this.handleMouseMove.bind(this));

        this.addClass('show');
    }
}



// Expose instance globally
window['SVGProgressChart'] = SVGProgressChart || {};
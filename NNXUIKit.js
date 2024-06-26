/**
 * Copyright (c) 2024
 * esinkutaykilic@gmail.com
 */

// v1.0.0

'use strict';

// import {window} from './controller/nnxGlobal.controller.js';
import {NNXUtil} from '@nnx/util';


class NNXApp {
    constructor(pages = []){
        this.pages = pages;
    }

    navigate(page){
        page.render();
    }

    findPage(path){
        path ??= window.location.pathname;

        const page = this.pages.find(function(item){
            return item.path == path;
        });

        return page;
    }

    findPageAndNavigate(path){
        const page = this.findPage(path);
        this.navigate(page);
    }
}

/**
 * HTML element abstraction
 * @since 1.0.0
 * @property  {NNXElementData} #connection MongoDb connection object
 */
class NNXElement{
    constructor(data = {}){
        this.elementData = data;
        this.elementData.attr ??= {};
        this.elementData.attr.id ??= window.crypto.randomUUID();
    }

    setElementConstructor(data){
        data ??= this.elementData;
        this.elementData = data;
        return new NNXElementConstructor(data);
    }

    append(){
        this.elementData.content = NNXUtil.absoluteArray(this.elementData.content || []);

        this.elementData.content.push(...arguments);
    }

    render(data){
        const elementConstructor = this.setElementConstructor(data);

        return elementConstructor.render();
    }

    reload(data){
        this.getElement()
            .replaceWith(this.render(data));
    }

    getElement(){
        const element = window.document.getElementById(this.elementData.attr.id);
        return element;
    }
}

class NNXElementConstructor{
    constructor(data, listeners = []){
        this.tag = data.tag;
        this.attr = data.attr;
        this.content = data.content;
        this.listeners = data.listeners || [];
    }

    render(){
        let element = this.content;

        if(this.tag){
            element = window.document.createElement(this.tag);

            let content = NNXUtil.absoluteArray(this.content);
            content = content?.flat(Infinity).map(function(item){
                if(!(item instanceof NNXElement)){
                    item = new NNXElement({
                        content: item
                    });
                }
                return item.render();
            });

            if(content){
                element.append(...content);
            }

            for(const key in this.attr){
                let attr = NNXUtil.absoluteArray(this.attr[key]);
                element.setAttribute(key, attr.join(' '));
            }
        }

        for(const listener of this.listeners){
            const target = listener.target || element;
            target.addEventListener(
                listener.type,
                listener.callback,
                listener.options
            );
        }

        return element;
    }
}

class AsyncContentController extends NNXElement{
    constructor(contentFunction){
        super({
            tag: 'div'
        });

        this.contentFunction = contentFunction;
        this.indicator = new NNXElement({
            tag: 'div',
            attr: {class: 'nnx-async-content-controller__indicator-container'},
            content: new NNXIndicator()
        });

        // this.indicator = new NNXIndicator();
    }

    setElementConstructor(){
        const data = {
            ...this.elementData,
            content: this.indicator
        };

        return new NNXElementConstructor(data);
    }

    render(data){
        const elementConstructor = this.setElementConstructor(data);
        this.containerElement = elementConstructor.render();

        this.loadContent();

        return this.containerElement;
    }

    async loadContent(contentFunctionParam = {}){
        this.containerElement.replaceChildren(this.indicator.render());
        let content = await this.contentFunction(...Object.values(contentFunctionParam));
        content = NNXUtil.absoluteArray(content).map(function(item){
            return item.render();
        });

        this.containerElement.replaceChildren(...content);
    }
}

class NNXForm extends NNXElement{
    constructor(config = {}, attr = {}){
        const mergedAttr = {
            ...attr,
            class: [
                'nnx-form',
                ...NNXUtil.absoluteArray(attr.class || [])
            ]
        }

        super({
            tag: 'form',
            attr: mergedAttr,
        });

        this.config = config;
        this.config.inputs ??= [];
        this.config.buttons ??= {};
        this.config.submitCallback ??= function(){};
    }

    setElementConstructor() {
        const data = {
            ...this.elementData,
            content: [
                this.#renderInputs(),
                this.#renderButtons(),
            ],
            listeners: [
                {
                    type: 'submit',
                    callback: this.#whenSubmit.bind(this),
                },
            ],
        };

        return new NNXElementConstructor(data);
    }

    #renderInputs() {
        const renderedInputs = this.config.inputs.map(function(item) {
            return item.render();
        });

        return renderedInputs;
    }

    #renderButtons() {
        const renderedButtons = Object.values(this.config.buttons).map(function(item) {
            return item.render();
        });

        return renderedButtons;
    }

    #whenSubmit(e){
        e.preventDefault();
        this.config.submitCallback(this.serialize());
        return false;
    }

    submit(){
        this.getElement().submit();
        // window.document.getElementById(this.elementData.attr.id).submit();
    }

    serialize(){
        // const form = window.document.getElementById(this.elementData.attr.id);
        const form = this.getElement();
        const formData = new FormData(form);

        const serializedData = {}
        for (const pair of formData.entries()) {
            serializedData[pair[0]] = pair[1];
        }

        return serializedData;
    }

    getInput(name){
        const input = this.config.inputs.find(function(item){
            return item.config.name === name;
        });

        return input;
    }
}

class NNXAnchor extends NNXElement{
    constructor(content, url, attr = {}){
        const data = {
            tag: 'a',
            content: content
        }

        if(url){
            data.attr = {
                href: url,
                ...attr
            };

            data.attr.target ??= '_blank';
        }

        super(data);
    }
}

/**
 * Standart button class
 * @since 1.0.0
 * @class
 * @property  {[string]} #htmlClass MongoDb connection object
 */
class NNXButton extends NNXElement{
    static TYPE = {
        CLEAN: 'nnx-button--type-clean'
    }

    #htmlClass = ['nnx-button'];

    /**
     * @param {Object} data
     * @param {Function} callback
     * @param {Object} options
     */
    constructor(data, callback = function(){}, options = {}){
        super({tag: 'button'});
        if(typeof data == 'string' || data instanceof NNXElement){
            data = {content: data}
        }
        this.data = data;
        this.setCallback(callback);
        this.options = options;

        this.options.type ??= NNXButton.TYPE.CLEAN;
    }

    setElementConstructor(){
        const attr = {
            ...this.elementData.attr,
            ...(this.data.attr || {}),
        }

        attr.class = NNXUtil.absoluteArray(attr.class || [])

        attr.class = [
            ...attr.class,
            ...this.#generateHtmlClass()
        ]

        const data = {
            ...this.elementData,
            ...this.data,
            attr,
            listeners: [
                {
                    type: 'click',
                    callback: this.callback,
                }
            ]
        };

        return new NNXElementConstructor(data);
    }

    #generateHtmlClass(){
        const htmlClass = [
            ...this.#htmlClass,
            this.options.type
        ];

        return htmlClass;
    }

    setCallback(callback){
        this.callback = callback.bind(this);
    }
}

class NNXHeading extends NNXElement{
    constructor(content, level){
        super();

        this.level = level;
        this.content = content;
    }

    setElementConstructor(){
        const data = {
            ...this.elementData,
            tag: `h${this.level}`,
            content: this.content
        };

        data.attr.class = NNXUtil.absoluteArray(data.attr.class || []);
        data.attr.class.push(`nnx-h${this.level}`);

        return new NNXElementConstructor(data);
    }
}

class NNXImage extends NNXElement{

    constructor(img){
        super({
            tag: 'img',
            attr: {class: 'nnx-img'}
        });

        this.img = img;
    }

    setElementConstructor(){
        const attr = {
            ...this.elementData.attr,
            src: this.img,
        }

        const data = {
            ...this.elementData,
            attr,
        };

        return new NNXElementConstructor(data);
    }
}

class NNXIndicator extends NNXElement{
    constructor(){
        super({
            tag: 'div',
            attr: {class: 'nnx-indicator'}
        });
    }

    setElementConstructor(){
        const data = {
            ...this.elementData,
            content: this.#renderDots()
        };

        return new NNXElementConstructor(data);
    }

    #renderDots(){
        const dotElementArray = [];

        for(let i = 0; i < 3; i++){
            dotElementArray.push(
                new NNXElement({
                    tag: 'div',
                    attr: {
                        class: 'nnx-indicator__dot',
                        style: `animation-delay: ${i / 3}s;`
                    }
                })
            );
        }

        return dotElementArray;
    }
}

class NNXInput extends NNXElement{
    constructor(config, elementData) {
        const data = {
            tag: 'div',
            ...elementData
        }

        data.attr ??= {};
        data.attr.class = NNXUtil.absoluteArray(data.attr.class || []);
        data.attr.class.push('nnx-input');
        
        super(data);

        this.config = config;
        this.config.when ??= {};
        this.input = this.#generateInputElement();
    }

    setElementConstructor(){
        const attr = {
            ...this.elementData.attr,
            ...(this.config.attr || {}),
        };

        const data = {
            ...this.elementData,
            ...this.data,
            attr,
            content: [
                this.#generateIconElement(),
                this.#generateLabelElement(),
                this.input,
            ],
        };

        return new NNXElementConstructor(data);
    }

    #generateInputElement() {
        const input = new NNXElement({
            tag: 'input',
            attr: {
                name: this.config.name,
                type: this.config.type,
                placeholder: this.config.placeholder,
            },
            listeners: [
                {
                    type: 'input',
                    callback: this.#whenInput.bind(this),
                },
                {
                    type: 'focus',
                    callback: this.#whenFocus.bind(this),
                },
                {
                    type: 'blur',
                    callback: this.#whenBlur.bind(this),
                },
            ],
        });

        return input;
    }

    #generateLabelElement(input) {
        input ??= this.input;

        const label = new NNXElement({
            tag: 'label',
            attr: {
                for: input.elementData.attr.id,
            },
            content: this.config.label,
        });

        return label;
    }

    #generateIconElement() {
        const icon = this.config.icon || '';

        return icon;
    }

    #whenInput(e) {
        if(this.config.when.input){
            this.config.when.input(e);
        }
    }

    #whenFocus(e) {
        if(this.config.when.focus){
            this.config.when.focus(e);
        }
    }

    #whenBlur(e) {
        if(this.config.when.blur){
            this.config.when.blur(e);
        }
    }

    setValue(value) {
        this.input.getElement().value = value;
    }
}

class NNXList extends NNXElement{
    constructor(content, attr = {}){
        const data = {
            tag: 'ul',
            attr: attr
        }

        data.attr.class = NNXUtil.absoluteArray(data.attr.class || []);
        data.attr.class.push('nnx-list');

        super(data);

        this.content = content;
    }

    setElementConstructor(){
        const data = {
            ...this.elementData,
            content: this.renderListItems()
        };

        return new NNXElementConstructor(data);
    }

    renderListItems(){
        const listItems = this.content.map(function(item){
            return new NNXListItem(item);
        });

        return listItems;
    }
}

class NNXListItem extends NNXElement{
    constructor(content){
        super({
            tag: 'li',
            attr: {class: 'nnx-list__item'},
            content: content
        });
    }
}

class NNXPage{
    static EVENT = {
        RENDER: 'nnxpage-render'
    }

    constructor(content, path, options = {}){
        this.content = this.createContent(content);
        this.path = path;
        this.options = options;
    }

    async createContent(content = []) {
        return content;
    }

    async render(){
        const body = window.document.body;

        const content = await this.content

        for(const contentItem of content){
            body.appendChild(contentItem.render());
        }

        const event = new Event(NNXPage.EVENT.RENDER);
        window.dispatchEvent(event);

        return this;
    }
}

class NNXParagraph extends NNXElement{
    constructor(content){
        super({
            tag: 'p',
            attr: {class: 'nnx-p'},
            content: content
        });
    }
}

class NNXSelect extends NNXInput{
    constructor(config, options = []) {
        super(config);

        this.config = config;
        this.options = options;
        this.input = this.#generateInputElement();
    }

    #generateInputElement() {
        const input = new NNXElement({
            tag: 'select',
            attr: {
                name: this.config.name,
            },
            content: this.#generateOptionElements(),
            listeners: [
                {
                    type: 'change',
                    callback: this.#whenInput,
                },
            ],
        });

        return input;
    }

    #generateOptionElements() {
        const optionElements = this.options.map((_, i) => {
            return this.#generateOptionElementAtIndex(i);
        });

        return optionElements;
    }

    #generateOptionElementAtIndex(i) {
        const item = this.options[i];
        const option = new NNXElement({
            tag: 'option',
            attr: {
                value: item.value,
            },
            content: item.text
        });

        return option;
    };

    #whenInput() {
        console.log('INPUT');
    };
}

class NNXVirtualAnchor extends NNXButton{
    constructor(content, url){
        super({
            tag: 'a',
            attr: {
                class: 'nnx-a-virtual',
                href: url,
            },
            content: content,
        });

        this.setCallback(this.#virtualRedirect);
    }

    #virtualRedirect = function(e){
        e.preventDefault();
        NNXUtil.virtualNavigate(e.currentTarget.href);
    }
}



export {
    NNXApp,
    AsyncContentController,
    NNXElement,
    NNXElementConstructor,
    NNXAnchor,
    NNXButton,
    NNXForm,
    NNXHeading,
    NNXImage,
    NNXIndicator,
    NNXInput,
    NNXList,
    NNXListItem,
    NNXPage,
    NNXParagraph,
    NNXSelect,
    NNXVirtualAnchor,
};

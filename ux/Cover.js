/**
 * @class Ext.ux.Cover
 * @extend Ext.DataView
 *
 * A Cover represents elements in a Store as visual elements in a Coverflow-like widget.
 * @author Maximiliano Fierro
 * @notes Inspired on zflow: http://css-vfx.googlecode.com/ By Charles Ying
*/
Ext.define('Ext.ux.Cover',{
    extend: 'Ext.DataView',
    xtype: 'cover',

    config:{
       /**
         * @cfg {Number} selectedIndex The idx from the Store that will be active first. Only one item can be active at a
         * time
         * @accessor
         * @evented
         */
        selectedIndex: 0,
    
        /**
         * @cfg {String} itemCls
         * A css class name to be added to each item element.
         */
        itemCls: '',

        /**
         * @cfg {Boolean} preventSelectionOnItemTap
         * Prevent selection when item is tapped. This is false by default.
         */
        preventSelectionOnItemTap: false,

        /**
         * @cfg {Number} angle for cover background items
         * This is the angle that not selected items are moved in space.
         */     
        angle: 70,
        
        /**
         * @cfg {Boolean} set to true if you want a flat representation. Defaults to false so the
         * coverflow remains 3d.
         */
        flat: false,

        /**
         * @cfg {Boolean} preventOrientationChange
         * Prevent attaching refresh method to orientation change event on Ext.Viewport
         */
        preventOrientationChange: false,
 
        //private
        baseCls: 'ux-cover',
        //private
        itemBaseCls: 'ux-cover-item-inner',
        //private
        scrollable: false,
        //private
        orientation: undefined
    },
    
    offset: 0,
    
    //override
    initialize: function(){
        var me = this,
            innerItemCls = me.getItemCls();

 
        if(innerItemCls) {
            me.setItemCls(innerItemCls+'-wrap');
        }

        me.callParent();
        
        me.element.on({
            drag: 'onDrag',
            dragstart: 'onDragStart',
            dragend: 'onDragEnd',
            scope: me
        });
        
        me.on({
            painted: 'onPainted',
            itemtap: 'doItemTap',
            scope: me
        }); 

        if(!me.getPreventOrientationChange()){
            //subscribe to orientation change on viewport
            Ext.Viewport.on('orientationchange', me.refresh, me);
        }

        me.setItemTransformation = (me.getFlat()) ? me.setItemTransformFlat : me.setItemTransform3d;
    },
    

    getElementConfig: function(){
        return {
            reference: 'element',
            children:[{
                reference: 'innerElement',
                className: 'ux-cover-scroller'
            }]
        }
    },

    applyFlat: function(flat) {
        return (Ext.os.is('Android')? true : flat); 
    },

    updateOrientation: function(newOrientation, oldOrientation) {
        var baseCls = this.getBaseCls(),
            el = this.element;

        if(el && newOrientation != oldOrientation) {
            el.removeCls(baseCls+'-'+oldOrientation);
            el.addCls(baseCls+'-'+newOrientation);
        }
    },

    applyItemTpl: function(config){
        if(Ext.isArray(config)){
            config = config.join("");
        }
        return new Ext.XTemplate('<div class="' + this.getItemBaseCls() + ' ' + this.getItemCls() + ' ">'+config+'</div>');
    },

    onPainted: function(){
        this.refresh(); 
    },

    //private
    getTargetEl: function(){
        return this.innerElement;   
    },

    onDragStart: function(){
        this.getTargetEl().dom.style.webkitTransitionDuration = "0s";
    },

    onDrag: function(e){
        var me = this,
            curr = me.getOffset(),
            ln = me.getViewItems().length,
            selectedIndex = me.getSelectedIndex();
            delta = e.previousDeltaX,
            offset;

        //slow down on border conditions
        if((selectedIndex === 0 && e.deltaX > 0) || (selectedIndex === ln - 1 && e.deltaX < 0)){
            delta.x *= 0.5;
        }

        offset = delta + curr;
        
        me.setOffset(offset, true);   
    },

    onDragEnd: function(){
        var me = this,
            idx = me.getSelectedIndex(),
            x = - (idx * me.gap);

        me.getTargetEl().dom.style.webkitTransitionDuration = "0.4s";
        me.applySelectedIndex(idx);
    },
    
    doItemTap: function(cover, index, item, evt){
        if(!this.getPreventSelectionOnItemTap() && this.getSelectedIndex() !== index){
            this.setSelectedIndex(index);
        }
    },

    getSelectedIndex: function(){
        var me = this,
            idx, ln;
        
        if(me.isRendered()){
            ln = me.getViewItems().length;
            idx = - Math.round(me.getOffset() / me.gap);
            me.selectedIndex = Math.min(Math.max(idx, 0),  ln - 1);
        }
        return me.selectedIndex;
    },

    applySelectedIndex: function(idx){
        var me = this;
        if(me.isRendered()){
            me.updateOffsetToIdx(idx);
            me.selectWithEvent(me.getStore().getAt(idx));
        }else{
            me.selectedIndex = idx;
        }
    },

    updateOffsetToIdx: function(idx){
        var ln = this.getViewItems().length,
            offset;
        
        idx = Math.min(Math.max(idx, 0), ln - 1);
        offset= -(idx * this.gap);
        this.setOffset(offset); 
    },

    setOffset: function(offset){
        var me = this,
            items = me.getViewItems(),
            item;

        me.offset = offset;
        me.getTargetEl().dom.style.webkitTransform = "translate3d(" + offset + "px, 0, 0)";

        for(var idx = 0, l = items.length; idx < l; idx++){
            item = Ext.get(items[idx]);
            me.setItemTransformation(item, idx, offset);
        }
    },

    getOffset: function(){
        return this.offset;
    },

    getBaseItemBox: function(containerBox){
        var cH = containerBox.height,
            cW = containerBox.width,
            sizeFactor = (cW > cH) ? 0.68 : 0.52,
            h, w;

        h = w = Math.min(containerBox.width, containerBox.height) * sizeFactor; 

        return {
            top: 40,
            height: h * 1.5, 
            width: w,
            left: (containerBox.width - w) / 2 
        };
    },

    setBoundaries: function(itemBox){
        var me = this,
            w = itemBox.width;

        if(this.getFlat()){
            me.gap = w * 1.1;
            me.threshold = this.gap / 3; 
            me.delta = w * 0.2;
        } else {
            me.gap = w / 3;
            me.threshold = this.gap / 2; 
            me.delta = w * 0.4;
        }
    },

    setItemTransformation: Ext.emptyFn,

    setItemTransform3d: function(item, idx, offset){
        var me = this,
            x = idx * me.gap,
            ix = x + offset,
            transf = "";

        if(ix < me.threshold && ix >= - me.threshold){
            transf = "translate3d("+x+"px, 0, 150px)"
            me.selectedIndex = idx;
        }else if(ix > 0){
            transf = "translate3d("+(x+me.delta)+"px, 0, 0) rotateY(-"+me.getAngle()+"deg)"
        }else{
            transf = "translate3d("+(x-me.delta)+"px, 0, 0) rotateY("+me.getAngle()+"deg)"
        }   
        item.dom.style.webkitTransform = transf;
    },

    setItemTransformFlat: function(item, idx, offset){
        var me = this,
            x = idx * me.gap,
            ix = x + offset,
            transf = "";

        if(ix < me.threshold && ix >= - me.threshold){
            transf = "translate3d("+x+"px, 0, 150px)"
            me.selectedIndex = idx;
        }else if(ix > 0){
            transf = "translate3d("+(x+me.delta)+"px, 0, 0)"
        }else{
            transf = "translate3d("+(x-me.delta)+"px, 0, 0)"
        }   
        item.dom.style.webkitTransform = transf;
    },


    doRefresh: function(me){
        var container = me.container,
            orientation = Ext.Viewport.getOrientation(),
            items,l;
            
        
        me.setOrientation(orientation);    
        me.callParent([me]);
        
        items = container.getViewItems();

        me.itemBox = me.getBaseItemBox(me.element.getBox());
        me.setBoundaries(me.itemBox);
        
        for(var idx = 0, l = items.length; idx < l; idx++){
            me.resizeItem(items[idx]);
        }

        me.setSelectedIndex(me.selectedIndex);
    },
    
    resizeItem: function(element){
        var itemBox = this.itemBox,
            item = Ext.get(element);
            
        item.setBox(itemBox);
        /**
            itemBox has an extra long in height to avoid reflection opacity over other items
            I need to create a wrapper element with same bg to avoid that issue.
        */
        item.down('.'+this.getItemBaseCls()).setBox({height: itemBox.height/1.5, width: itemBox.width});
    },
    
    //override
    onStoreUpdate: function(store, record, newIndex, oldIndex) {
        var me = this,
            container = me.container,
            item;

        oldIndex = (typeof oldIndex === 'undefined') ? newIndex : oldIndex;

        if (oldIndex !== newIndex) {
            container.moveItemsToCache(oldIndex, oldIndex);
            container.moveItemsFromCache([record]);
        }
        else {
            item = container.getViewItems()[newIndex];
            // Bypassing setter because sometimes we pass the same record (different data)
            container.updateListItem(record, item);
            me.resizeItem(item);

        }
    }
});


<template>
    <el-row>
        <el-col class='grid-content bg-purple-light' id='DiagramDiv'>
        </el-col>
    </el-row>
</template>

<script lang='ts'>
import Vue from 'vue';
import * as go from 'gojs';
import { FigureParameter } from './Figures';

export default Vue.extend({
    name: 'DrawingBoard',
    data() {
        return {
            $: null,
            diagram: null,
            addNodeSourceId: null,
            addNodeTargetId: null,
            addNodeTargetType: null,
            isUpdateOrCreate: true,
            currentLinkStatus: {
                status: null
            }
        };
    },
    props: {
        data: {},
    },
    activated() {
        if (!this.$route.meta.isUseCache) {
            this.addNodeSourceId = null;
        }
    },
    mounted() {
        this.importShapesFromExternal();
        this.initDrawingBoard();
        this.drawing(this.data);
    },
    methods: {
        importShapesFromExternal() { // 引入扩展形状
            FigureParameter.setFigureParameter('ThinX', 0, new FigureParameter('Thickness', 10));
        },
        initDrawingBoard() {
            this.$ = go.GraphObject.make;
            this.diagram = this.$(go.Diagram, 'DiagramDiv',
                {
                    nodeSelectionAdornmentTemplate:
                        this.$(go.Adornment, 'Auto',
                            this.$(go.Shape, 'Rectangle', { fill: 'white', stroke: null }),
                        ),  // 去除节点选中时的蓝色边框
                    allowCopy: false, // 禁止copy节点
                    allowDelete: false, // 禁止删除节点
                    initialAutoScale: go.Diagram.Uniform,  // 画布自适应大小
                    'undoManager.isEnabled': false, // 禁止undo操作
                    hoverDelay: 100,  // hover动作触发延迟时间,
                    layout: this.$(go.LayeredDigraphLayout, {
                        layerSpacing: 100, // 不同层item之间的宽度
                        columnSpacing: 20, // 同层item之间的宽度
                        setsPortSpots: false, // 禁用布局自动线条进出位置
                        aggressiveOption: 'AggressiveNone' // 不需要进行交叉计算
                    }),
                },
            );
        },
        addNode(params) {
            // 真正执行画图,连线等添加节点动作
            let linkStatus = null;
            let tempKey = params['id'];
            let keys = [];
            let newLink = {};
            for (let item of this.diagram.model.nodeDataArray) {
                keys.push(Number(item['key']));
            }
            let i = 0;
            while (i < keys.length) {
                if (keys.includes(tempKey)) {
                    tempKey += 0.01;
                }
                i += 1;
            }
            const newNode = {
                key: String(tempKey),
                content: params['name'],
                mode: params['mode'],
                showAgreeSymbol: true,
                showRejectSymbol: true,
                category: params['type']
            };
            if (!this.addNodeSourceId) {
                this.drawNodeTemplate({nodes: [], edges: []});
                this.diagram.startTransaction('add Node');
            } else {
                this.diagram.startTransaction('add Node');
                const sourceNodeData = this.diagram.model.findNodeDataForKey(this.addNodeSourceId);
                linkStatus = this.currentLinkStatus.status;
                const whichSymbol = linkStatus === 'reject' ? 'showRejectSymbol' : 'showAgreeSymbol';
                this.diagram.model.setDataProperty(sourceNodeData, whichSymbol, false);
                newLink = {
                    from: this.addNodeSourceId,
                    to: newNode['key'],
                    status: linkStatus,
                };
                this.diagram.model.addLinkData(newLink);
            }
            this.diagram.model.addNodeData(newNode);
            this.diagram.commitTransaction('add Node');
            if (linkStatus === 'agree') {
                this.resolveLinkCross(newLink);
            }
            this.diagram.zoomToFit();
        },
        resolveLinkCross(newLink) {
            for (let link of this.diagram.model.linkDataArray) {
                if (link['from'] === newLink['from'] && link['status'] === 'reject') {
                    this.diagram.model.removeLinkData(link);
                    this.diagram.model.addLinkData(link);
                }
            }
        },
        addRoutingNode(e, obj) {
            this.addNodeSourceId = obj.part.data.key;
        },

        addDecisionNode(e, obj) {
            this.addNodeSourceId = obj.part.data.key;
        },
        drawInitButton() {
            this.diagram.model = new go.GraphLinksModel([{}]);
            this.diagram.allowMove = false;
            this.diagram.allowHorizontalScroll = false;
            this.diagram.allowVerticalScroll = false;
        },
        DeleteNode(e, obj) {
            const data = obj.part.data;
            if (!data['showRejectSymbol'] || !data['showAgreeSymbol']) {
                return;
            }

            this.diagram.startTransaction('delete Node');
            this.diagram.model.removeNodeData(data);
            for (let selectedLink of this.diagram.model.linkDataArray) {
                if (selectedLink['to'] === data['key']) {
                    let fromData = this.diagram.model.findNodeDataForKey(selectedLink['from']);
                    let propertyName = selectedLink['status'] === 'reject' ? 'showRejectSymbol' : 'showAgreeSymbol';
                    this.diagram.model.setDataProperty(fromData, propertyName, true);
                    this.diagram.model.removeLinkData(selectedLink);
                }
            }
            this.diagram.commitTransaction('delete Node');

            if (this.diagram.model.nodeDataArray.length === 0 && this.diagram.model.linkDataArray.length === 0) {
                this.drawInitButton();
                this.addNodeSourceId = null;
                return;
            }
            this.diagram.zoomToFit();
        },
        defineRoutingTemplate() {
            // 菱形模板样例 ( 模板+右选项框+底选项框)
            // 定义右侧装饰器(右选项框)
            const DisplayRightRoutingChoices = this.$(go.Adornment, 'Spot',
                {
                    background: 'transparent', // 背景颜色为透明
                    mouseLeave: function (e, obj) {
                        let ad = obj.part;
                        ad.adornedPart.removeAdornment('mouseHoverAdornment');// 移除被装饰对象的mouseHoverAdornment装饰器
                    },
                    click: function (e, obj) {
                        let ad = obj.part;
                        ad.adornedPart.removeAdornment('mouseHoverAdornment');
                    },
                },
                this.$(go.Placeholder,
                    {
                        background: 'transparent',  // 颜色为透明,可以看到被placeholder覆盖的元素
                        mouseHover: function (e, obj) {
                            let ad = obj.part;
                            ad.adornedPart.removeAdornment('mouseHoverAdornment');
                        }
                    }),
                this.$('Button', {width: 80, height: 30},
                    {alignment: new go.Spot(1, 0.326), alignmentFocus: go.Spot.Left},
                    {
                        click: this.addRoutingNode
                    },
                    this.$(go.TextBlock, '菱形框')),
                this.$('Button', {width: 80, height: 30},
                    {alignment: new go.Spot(1, 0.54), alignmentFocus: go.Spot.Left},
                    {
                        click: this.addDecisionNode
                    },
                    this.$(go.TextBlock, '方形框'))
            );
                // 底部装饰器(底部选项框)
            const DisplayBottomRoutingChoices = this.$(go.Adornment, 'Spot',
                {
                    background: 'transparent',
                    mouseLeave: function (e, obj) {
                        let ad = obj.part;
                        ad.adornedPart.removeAdornment('mouseHoverAdornment');
                    },
                    click: function (e, obj) {
                        let ad = obj.part;
                        ad.adornedPart.removeAdornment('mouseHoverAdornment');
                    },
                },
                this.$(go.Placeholder,
                    {
                        background: 'transparent',
                        mouseHover: function (e, obj) {
                            let ad = obj.part;
                            ad.adornedPart.removeAdornment('mouseHoverAdornment');
                        }
                    }),
                this.$('Button', {width: 80, height: 30},
                    {alignment: new go.Spot(0.5, 1), alignmentFocus: go.Spot.Top},
                    {click: this.addRoutingNode},
                    this.$(go.TextBlock, '菱形框')),
                this.$('Button', {width: 80, height: 30},
                    {alignment: new go.Spot(0.5, 1.21), alignmentFocus: go.Spot.Top},
                    {click: this.addDecisionNode},
                    this.$(go.TextBlock, '方形框')),
            );
            let linkStatus = this.currentLinkStatus;
            const isUpdateOrCreate = this.isUpdateOrCreate;
            const template = this.$(go.Node, 'Spot', {
                zOrder: 10,
                portId: '',
                fromEndSegmentLength: 0,
                toEndSegmentLength: 0,
                toSpot: new go.Spot(0, 0.44),
            },
            this.$(go.Panel, 'Auto',
                this.$(go.Shape, {figure: 'Diamond', fill: '#f0f0f4', width: 200, height: 120, }),
                this.$(go.Panel, 'Vertical', {alignment: go.Spot.Center},
                    this.$(go.TextBlock, {
                        font: '18px sans-serif',
                        stroke: '#065279',
                        margin: 5,
                        width: 100, // 设定字符区域宽度, 默认是无限宽,所以不会出现过长字符.下面两个配置也就不会生效.
                        overflow: go.TextBlock.OverflowEllipsis, // 与wrap配合实现过长字符显示省略号
                        wrap: go.TextBlock.None,
                        textAlign: 'center',
                    }, new go.Binding('text', 'content'),
                    { // 定义tooltip. 即：当鼠标悬浮于本元素时,自动展示如下元素
                        toolTip: this.$('ToolTip', this.$(go.TextBlock,
                            {font: '18px sans-serif', stroke: '#065279', },
                            new go.Binding('text', 'content')))
                    },
                    ),
                    this.$(go.TextBlock, {
                        font: '13px sans-serif',
                        stroke: 'black',
                        textAlign: 'center',
                        margin: 5,
                    }, new go.Binding('text', 'mode'))
                ), {click: this.doSomethine}
            ),
                // 右上角 x 符号
            this.$(go.Panel, 'Spot',
                {
                    alignment: new go.Spot(0.7, 0.2),
                }, new go.Binding('opacity', '', function (node) {
                    return node.showAgreeSymbol && node.showRejectSymbol && isUpdateOrCreate;
                }),
                this.$(go.Shape, 'Circle', {
                    desiredSize: new go.Size(12, 12),
                    fill: 'red',
                    stroke: 'red',
                    alignment: go.Spot.Center
                }
                ),
                this.$(go.Shape, 'ThinX', {
                    desiredSize: new go.Size(5, 5),
                    fill: 'white',
                    stroke: 'white',
                    strokeWidth: 2,
                    alignment: go.Spot.Center
                },
                    // 定义删除动作
                {click: this.DeleteNode})
            ),
                // 右侧 + 符号
            this.$(go.Shape, 'PlusLine', {
                stroke: '#a3d900',
                alignment: go.Spot.Right,  // 选择图形位置,默认一般在框内一半在框外
                alignmentFocus: go.Spot.Left, // 如果和 alignment 相反,图形完全在框外.如果一样则图形全部在框内
                strokeWidth: 3,
                desiredSize: new go.Size(15, 15),
            }, new go.Binding('opacity', '', function (node) {
                return node.showAgreeSymbol && isUpdateOrCreate;
            }),
            {   // mouseHover 事件发生时,增加装饰器
                mouseHover: function (e, obj) {
                    let node = obj.part;
                    if (!node.data.showAgreeSymbol) { // 隐藏状态不响应事件
                        return;
                    }
                    linkStatus.status = 'agree';
                    DisplayRightRoutingChoices.adornedObject = node;// 给装饰器指定被装饰对象
                    node.addAdornment('mouseHoverAdornment', DisplayRightRoutingChoices);// 被装饰对象增加mouseHoverAdornment装饰器
                }
            }
            ),
                // 底部 + 符号
            this.$(go.Shape, 'PlusLine', {
                alignment: go.Spot.Bottom,
                alignmentFocus: go.Spot.Top,
                stroke: 'red',
                strokeWidth: 3,
                desiredSize: new go.Size(15, 15),
            }, new go.Binding('opacity', '', function (node) {
                return node.showRejectSymbol && isUpdateOrCreate;
            }),
            {
                mouseHover: function (e, obj) {
                    const node = obj.part;
                    if (!node.data.showRejectSymbol) { // 隐藏状态不响应事件
                        return;
                    }
                    linkStatus.status = 'reject';
                    DisplayBottomRoutingChoices.adornedObject = node;
                    node.addAdornment('mouseHoverAdornment', DisplayBottomRoutingChoices);
                }
            })
            );
            return template;
        },
        defineDecisionTemplate() {
            // 菱形模板样例 ( 模板+选项框)
            // 定义选项框
            const isUpdateOrCreate = this.isUpdateOrCreate;
            let linkStatus = this.currentLinkStatus;
            const DisplayDecisionChoices = this.$(go.Adornment, 'Spot',
                {
                    background: 'transparent',
                    mouseLeave: function (e, obj) {
                        let ad = obj.part;
                        ad.adornedPart.removeAdornment('mouseHoverAdornment');
                    },
                    click: function (e, obj) {
                        let ad = obj.part;
                        ad.adornedPart.removeAdornment('mouseHoverAdornment');
                    },
                },
                this.$(go.Placeholder,
                    {
                        background: 'transparent',
                        mouseHover: function (e, obj) {
                            let ad = obj.part;
                            ad.adornedPart.removeAdornment('mouseHoverAdornment');
                        }
                    }),
                this.$('Button', {width: 80, height: 30},
                    {alignment: new go.Spot(1, 0.76), alignmentFocus: go.Spot.Left},
                    {click: this.addDecisionNode},
                    this.$(go.TextBlock, '方形框')),
                this.$('Button', {width: 80, height: 30},
                    {alignment: new go.Spot(1, 0.32), alignmentFocus: go.Spot.Left},
                    {click: this.addRoutingNode},
                    this.$(go.TextBlock, '菱形框'))
            );
                // 定义方形模板(长方形)
            const template = this.$(go.Node, 'Spot', {
                zOrder: 10,
                fromEndSegmentLength: 0,
                toEndSegmentLength: 0,
                toSpot: new go.Spot(0, 0.55)
            },
            this.$(go.Panel, 'Auto',
                this.$(go.Shape, {
                    figure: 'RoundedRectangle', fill: '#f0f0f4', width: 120, height: 60,
                }),
                this.$(go.Panel, 'Vertical',
                    this.$(go.TextBlock, {
                        font: '15px sans-serif',
                        stroke: '#065279',
                        textAlign: 'center',
                        width: 100,
                        overflow: go.TextBlock.OverflowEllipsis,
                        wrap: go.TextBlock.None,
                        margin: 5,
                    }, new go.Binding('text', 'content'),
                    {
                        toolTip: this.$('ToolTip',
                            this.$(go.TextBlock, {font: '15px sans-serif', stroke: '#065279'},
                                new go.Binding('text', 'content')))
                    }),
                    this.$(go.TextBlock, {
                        font: '13px sans-serif',
                        stroke: 'black',
                        textAlign: 'center',
                        margin: 5,
                    }, new go.Binding('text', 'mode'))
                ),
                {click: this.doSomething}
            ),
                // 右上角 x 符号
            this.$(go.Panel, 'Spot',
                {alignment: go.Spot.TopRight},
                new go.Binding('opacity', '', function (node) {
                    return node.showAgreeSymbol && node.showRejectSymbol && isUpdateOrCreate;
                }),
                this.$(go.Shape, 'Circle', {
                    desiredSize: new go.Size(12, 12),
                    fill: 'red',
                    stroke: 'red',
                    alignment: go.Spot.Center
                }
                ),
                this.$(go.Shape, 'ThinX', {
                    desiredSize: new go.Size(5, 5),
                    fill: 'white',
                    stroke: 'white',
                    strokeWidth: 2,
                    alignment: go.Spot.Center
                }), {click: this.DeleteNode}
            ),
                // 右侧 + 符号
            this.$(go.Shape, 'PlusLine', {
                alignment: go.Spot.Right,
                alignmentFocus: go.Spot.Left,
                stroke: '#808080',
                strokeWidth: 3,
                desiredSize: new go.Size(15, 15),
            }, new go.Binding('opacity', '', function (node) {
                return node.showAgreeSymbol && isUpdateOrCreate;
            }),
            {
                mouseHover: function (e, obj) {
                    linkStatus.status = 'pass';
                    let node = obj.part;
                    if (!node.data.showAgreeSymbol) { // 隐藏状态不响应事件
                        return;
                    }
                    DisplayDecisionChoices.adornedObject = node;
                    node.addAdornment('mouseHoverAdornment', DisplayDecisionChoices);
                }
            })
            );
            return template;
        },
        // 定义连接线模板
        defineLinkTemplate() {
            const linkTemplate = this.$(go.Link, {zOrder: -100},
                new go.Binding('fromSpot', 'status', function (status) {
                    if (status === 'reject') {
                        return new go.Spot(0.46, 0.87);
                    } else if (status === 'agree') {
                        return new go.Spot(0.91, 0.44);
                    } else {
                        return new go.Spot(0.87, 0.55);
                    }
                }),
                // 线
                this.$(go.Shape, {stroke: '#a78e44'}, new go.Binding('stroke', 'status',
                    function (status) {
                        // 动态绑定线条颜色
                        if (status === 'pass') {
                            return 'black';
                        } else if (status === 'reject') {
                            return 'red';
                        } else if (status === 'agree') {
                            return 'green';
                        }
                    })),
                // 角
                this.$(go.Shape, {
                    toArrow: 'Standard',
                    fill: '#a78e44', // 默认填充颜色
                    stroke: '#a78e44' // 默认线条颜色
                }, new go.Binding('fill', 'status', function (status) {
                    // 动态填充绑定填充颜色
                    if (status === 'pass') {
                        return 'black';
                    } else if (status === 'reject') {
                        return 'red';
                    } else if (status === 'agree') {
                        return 'green';
                    }
                }),
                new go.Binding('stroke', 'status', function (status) {
                    if (status === 'pass') {
                        return 'black';
                    } else if (status === 'reject') {
                        return 'red';
                    } else if (status === 'agree') {
                        return 'green';
                    }
                })),
            );
            return linkTemplate;
        },
     
        drawNodeTemplate(data) {
            const routingTemplate = this.defineRoutingTemplate();
            const decisionTemplate = this.defineDecisionTemplate();
            // 初始化模板map
            const templmap = new go.Map<string, go.Node>();
            // 注册模板样式
            templmap.add('routing', routingTemplate);
            templmap.add('decision', decisionTemplate);
            // 配置diagram
            this.diagram.nodeTemplateMap = templmap;
            this.diagram.linkTemplate = this.defineLinkTemplate();
            this.diagram.model = new go.GraphLinksModel(data.nodes, data.edges);
            this.diagram.allowMove = true;
            this.diagram.allowHorizontalScroll = true;
            this.diagram.allowVerticalScroll = true;
            this.diagram.padding.right = 100;
            this.diagram.padding.bottom = 100;
        },

        async drawing(data) {
            // 生成nodes links 数据
            this.drawNodeTemplate({nodes:[], edges:[]});
        }
    }
});

</script>

<style scoped>
    .bg-purple-light {
        background: white;
        border: 1px solid #C0C4CC;
    }

    .grid-content {
        border-radius: 4px;
        min-height: 560px;
        margin: 10px 0;
    }

</style>

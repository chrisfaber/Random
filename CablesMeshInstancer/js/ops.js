"use strict";

var CABLES=CABLES||{};
CABLES.OPS=CABLES.OPS||{};

var Ops=Ops || {};
Ops.Gl=Ops.Gl || {};
Ops.Anim=Ops.Anim || {};
Ops.Array=Ops.Array || {};
Ops.Points=Ops.Points || {};
Ops.Trigger=Ops.Trigger || {};
Ops.Gl.Matrix=Ops.Gl.Matrix || {};
Ops.Gl.Meshes=Ops.Gl.Meshes || {};
Ops.Gl.Shader=Ops.Gl.Shader || {};



// **************************************************************
// 
// Ops.Gl.MainLoop
// 
// **************************************************************

Ops.Gl.MainLoop = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const fpsLimit = op.inValue("FPS Limit", 0);
const trigger = op.outTrigger("trigger");
const width = op.outValue("width");
const height = op.outValue("height");
const reduceFocusFPS = op.inValueBool("Reduce FPS not focussed", true);
const reduceLoadingFPS = op.inValueBool("Reduce FPS loading");
const clear = op.inValueBool("Clear", true);
const clearAlpha = op.inValueBool("ClearAlpha", true);
const fullscreen = op.inValueBool("Fullscreen Button", false);
const active = op.inValueBool("Active", true);
const hdpi = op.inValueBool("Hires Displays", false);

op.onAnimFrame = render;
hdpi.onChange = function ()
{
    if (hdpi.get()) op.patch.cgl.pixelDensity = window.devicePixelRatio;
    else op.patch.cgl.pixelDensity = 1;

    op.patch.cgl.updateSize();
    if (CABLES.UI) gui.setLayout();
};

active.onChange = function ()
{
    op.patch.removeOnAnimFrame(op);

    if (active.get())
    {
        op.setUiAttrib({ "extendTitle": "" });
        op.onAnimFrame = render;
        op.patch.addOnAnimFrame(op);
        op.log("adding again!");
    }
    else
    {
        op.setUiAttrib({ "extendTitle": "Inactive" });
    }
};

const cgl = op.patch.cgl;
let rframes = 0;
let rframeStart = 0;

if (!op.patch.cgl) op.uiAttr({ "error": "No webgl cgl context" });

const identTranslate = vec3.create();
vec3.set(identTranslate, 0, 0, 0);
const identTranslateView = vec3.create();
vec3.set(identTranslateView, 0, 0, -2);

fullscreen.onChange = updateFullscreenButton;
setTimeout(updateFullscreenButton, 100);
let fsElement = null;


let winhasFocus = true;
let winVisible = true;

window.addEventListener("blur", () => { winhasFocus = false; });
window.addEventListener("focus", () => { winhasFocus = true; });
document.addEventListener("visibilitychange", () => { winVisible = !document.hidden; });


function getFpsLimit()
{
    if (reduceLoadingFPS.get() && op.patch.loading.getProgress() < 1.0) return 5;

    if (reduceFocusFPS.get())
    {
        if (!winVisible) return 10;
        if (!winhasFocus) return 30;
    }

    return fpsLimit.get();
}


function updateFullscreenButton()
{
    function onMouseEnter()
    {
        if (fsElement)fsElement.style.display = "block";
    }

    function onMouseLeave()
    {
        if (fsElement)fsElement.style.display = "none";
    }

    op.patch.cgl.canvas.addEventListener("mouseleave", onMouseLeave);
    op.patch.cgl.canvas.addEventListener("mouseenter", onMouseEnter);

    if (fullscreen.get())
    {
        if (!fsElement)
        {
            fsElement = document.createElement("div");

            const container = op.patch.cgl.canvas.parentElement;
            if (container)container.appendChild(fsElement);

            fsElement.addEventListener("mouseenter", onMouseEnter);
            fsElement.addEventListener("click", function (e)
            {
                if (CABLES.UI && !e.shiftKey) gui.cycleRendererSize();
                else cgl.fullScreen();
            });
        }

        fsElement.style.padding = "10px";
        fsElement.style.position = "absolute";
        fsElement.style.right = "5px";
        fsElement.style.top = "5px";
        fsElement.style.width = "20px";
        fsElement.style.height = "20px";
        fsElement.style.cursor = "pointer";
        fsElement.style["border-radius"] = "40px";
        fsElement.style.background = "#444";
        fsElement.style["z-index"] = "9999";
        fsElement.style.display = "none";
        fsElement.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" version=\"1.1\" id=\"Capa_1\" x=\"0px\" y=\"0px\" viewBox=\"0 0 490 490\" style=\"width:20px;height:20px;\" xml:space=\"preserve\" width=\"512px\" height=\"512px\"><g><path d=\"M173.792,301.792L21.333,454.251v-80.917c0-5.891-4.776-10.667-10.667-10.667C4.776,362.667,0,367.442,0,373.333V480     c0,5.891,4.776,10.667,10.667,10.667h106.667c5.891,0,10.667-4.776,10.667-10.667s-4.776-10.667-10.667-10.667H36.416     l152.459-152.459c4.093-4.237,3.975-10.99-0.262-15.083C184.479,297.799,177.926,297.799,173.792,301.792z\" fill=\"#FFFFFF\"/><path d=\"M480,0H373.333c-5.891,0-10.667,4.776-10.667,10.667c0,5.891,4.776,10.667,10.667,10.667h80.917L301.792,173.792     c-4.237,4.093-4.354,10.845-0.262,15.083c4.093,4.237,10.845,4.354,15.083,0.262c0.089-0.086,0.176-0.173,0.262-0.262     L469.333,36.416v80.917c0,5.891,4.776,10.667,10.667,10.667s10.667-4.776,10.667-10.667V10.667C490.667,4.776,485.891,0,480,0z\" fill=\"#FFFFFF\"/><path d=\"M36.416,21.333h80.917c5.891,0,10.667-4.776,10.667-10.667C128,4.776,123.224,0,117.333,0H10.667     C4.776,0,0,4.776,0,10.667v106.667C0,123.224,4.776,128,10.667,128c5.891,0,10.667-4.776,10.667-10.667V36.416l152.459,152.459     c4.237,4.093,10.99,3.975,15.083-0.262c3.992-4.134,3.992-10.687,0-14.82L36.416,21.333z\" fill=\"#FFFFFF\"/><path d=\"M480,362.667c-5.891,0-10.667,4.776-10.667,10.667v80.917L316.875,301.792c-4.237-4.093-10.99-3.976-15.083,0.261     c-3.993,4.134-3.993,10.688,0,14.821l152.459,152.459h-80.917c-5.891,0-10.667,4.776-10.667,10.667s4.776,10.667,10.667,10.667     H480c5.891,0,10.667-4.776,10.667-10.667V373.333C490.667,367.442,485.891,362.667,480,362.667z\" fill=\"#FFFFFF\"/></g></svg>";
    }
    else
    {
        if (fsElement)
        {
            fsElement.style.display = "none";
            fsElement.remove();
            fsElement = null;
        }
    }
}

op.onDelete = function ()
{
    cgl.gl.clearColor(0, 0, 0, 0);
    cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT | cgl.gl.DEPTH_BUFFER_BIT);
};


function render(time)
{
    if (!active.get()) return;
    if (cgl.aborted || cgl.canvas.clientWidth === 0 || cgl.canvas.clientHeight === 0) return;

    const startTime = performance.now();

    op.patch.config.fpsLimit = getFpsLimit();

    if (cgl.canvasWidth == -1)
    {
        cgl.setCanvas(op.patch.config.glCanvasId);
        return;
    }

    if (cgl.canvasWidth != width.get() || cgl.canvasHeight != height.get())
    {
        width.set(cgl.canvasWidth);
        height.set(cgl.canvasHeight);
    }

    if (CABLES.now() - rframeStart > 1000)
    {
        CGL.fpsReport = CGL.fpsReport || [];
        if (op.patch.loading.getProgress() >= 1.0 && rframeStart !== 0)CGL.fpsReport.push(rframes);
        rframes = 0;
        rframeStart = CABLES.now();
    }
    CGL.MESH.lastShader = null;
    CGL.MESH.lastMesh = null;

    cgl.renderStart(cgl, identTranslate, identTranslateView);

    if (clear.get())
    {
        cgl.gl.clearColor(0, 0, 0, 1);
        cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT | cgl.gl.DEPTH_BUFFER_BIT);
    }

    trigger.trigger();

    if (CGL.MESH.lastMesh)CGL.MESH.lastMesh.unBind();

    if (CGL.Texture.previewTexture)
    {
        if (!CGL.Texture.texturePreviewer) CGL.Texture.texturePreviewer = new CGL.Texture.texturePreview(cgl);
        CGL.Texture.texturePreviewer.render(CGL.Texture.previewTexture);
    }
    cgl.renderEnd(cgl);

    if (clearAlpha.get())
    {
        cgl.gl.clearColor(1, 1, 1, 1);
        cgl.gl.colorMask(false, false, false, true);
        cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT);
        cgl.gl.colorMask(true, true, true, true);
    }

    if (!cgl.frameStore.phong)cgl.frameStore.phong = {};
    rframes++;

    CGL.profileData.profileMainloopMs = performance.now() - startTime;
}


};

Ops.Gl.MainLoop.prototype = new CABLES.Op();
CABLES.OPS["b0472a1d-db16-4ba6-8787-f300fbdc77bb"]={f:Ops.Gl.MainLoop,objName:"Ops.Gl.MainLoop"};




// **************************************************************
// 
// Ops.Gl.MeshInstancer_v2
// 
// **************************************************************

Ops.Gl.MeshInstancer_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    exe=op.inTrigger("exe"),
    geom=op.inObject("geom"),
    inScale=op.inValue("Scale",1),

    doLimit=op.inValueBool("Limit Instances",false),
    inLimit=op.inValueInt("Limit",100),

    inTranslates=op.inArray("positions"),
    inScales=op.inArray("Scale Array"),
    inRot=op.inArray("Rotations"),
    outNum=op.outValue("Num");

const cgl=op.patch.cgl;
geom.ignoreValueSerialize=true;

var mod=null;
var mesh=null;
var shader=null;
var uniDoInstancing=null;
var recalc=true;
var num=0;

op.setPortGroup("Limit Number of Instances",[inLimit,doLimit]);
op.setPortGroup("Parameters",[inScales,inRot,inTranslates]);
op.toWorkPortsNeedToBeLinked(geom);

doLimit.onChange=updateLimit;
exe.onTriggered=doRender;
exe.onLinkChanged=removeModule;

var matrixArray=new Float32Array(1);
var m=mat4.create();

updateLimit();

inRot.onChange=
    inTranslates.onChange=
    inScales.onChange=reset;

var srcHeadVert=''
    .endl()+'UNI float do_instancing;'
    .endl()+'UNI float MOD_scale;'

    .endl()+'#ifdef INSTANCING'
    .endl()+'   IN mat4 instMat;'
    .endl()+'   OUT mat4 instModelMat;'
    .endl()+'#endif';

var srcBodyVert=''
    .endl()+'#ifdef INSTANCING'
    .endl()+'    mMatrix*=instMat;'
    .endl()+'    pos.xyz*=MOD_scale;'
    .endl()+'#endif'
    .endl();

geom.onChange=function()
{
    if(mesh)mesh.dispose();
    if(!geom.get())
    {
        mesh=null;
        return;
    }
    mesh=new CGL.Mesh(cgl,geom.get());
    reset();
};

function removeModule()
{
    if(shader && mod)
    {
        shader.removeDefine('INSTANCING');
        shader.removeModule(mod);
        shader=null;
    }
}

function reset()
{
    recalc=true;
}

function setupArray()
{
    if(!mesh)return;

    var transforms=inTranslates.get();
    if(!transforms)transforms=[0,0,0];

    num=Math.floor(transforms.length/3);
    var scales=inScales.get();

    if(matrixArray.length!=num*16) matrixArray=new Float32Array(num*16);

    const rotArr=inRot.get();

    for(var i=0;i<num;i++)
    {
        mat4.identity(m);

        mat4.translate(m,m,
            [
                transforms[i*3],
                transforms[i*3+1],
                transforms[i*3+2]
            ]);

        if(rotArr)
        {
            mat4.rotateX(m,m,rotArr[i*3+0]*CGL.DEG2RAD);
            mat4.rotateY(m,m,rotArr[i*3+1]*CGL.DEG2RAD);
            mat4.rotateZ(m,m,rotArr[i*3+2]*CGL.DEG2RAD);
        }
        //if(scales && scales.length>i) mat4.scale(m,m,[scales[i],scales[i+1],scales[i+2]]);
        if(scales && scales.length>i) mat4.scale(m,m,[scales[i*3],scales[i*3+1],scales[i*3+2]]);
            else mat4.scale(m,m,[1,1,1]);

        for(var a=0;a<16;a++) matrixArray[i*16+a]=m[a];
    }

    mesh.numInstances=num;
    mesh.addAttribute('instMat',matrixArray,16);
    recalc=false;
}

function updateLimit()
{
    if(doLimit.get()) inLimit.setUiAttribs({hidePort:false,greyout:false});
        else inLimit.setUiAttribs({hidePort:true,greyout:true});
}

function doRender()
{
    if(!mesh) return;
    if(recalc)setupArray();
    if(recalc)return;
    if(matrixArray.length<=1)return;

    if(cgl.getShader() && cgl.getShader()!=shader)
    {
        removeModule();

        shader=cgl.getShader();
        if(!shader.hasDefine('INSTANCING'))
        {
            mod=shader.addModule(
                {
                    name: 'MODULE_VERTEX_POSITION',
                    title: op.objName,
                    priority:-2,
                    srcHeadVert: srcHeadVert,
                    srcBodyVert: srcBodyVert
                });

            shader.define('INSTANCING');
            inScale.uniform=new CGL.Uniform(shader,'f',mod.prefix+'scale',inScale);
        }
    }

    if(doLimit.get()) mesh.numInstances=Math.min(num,inLimit.get());
        else mesh.numInstances=num;

    outNum.set(mesh.numInstances);


    if(mesh.numInstances>0) mesh.render(shader);
}


};

Ops.Gl.MeshInstancer_v2.prototype = new CABLES.Op();
CABLES.OPS["8fb63135-3d2a-443f-8022-214ba2b7c8cc"]={f:Ops.Gl.MeshInstancer_v2,objName:"Ops.Gl.MeshInstancer_v2"};




// **************************************************************
// 
// Ops.Gl.Meshes.Cube
// 
// **************************************************************

Ops.Gl.Meshes.Cube = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};

/*
next version:

- make rebuildLater functionality
- make mapping mode for unconnected sides: no more face mapping texture problems (then we don't need that bias...)
- maybe checkboxes to disable some sides ?
- tesselation

*/

const
    render=op.inTrigger('render'),
    width=op.inValue('width',1),
    height=op.inValue('height',1),
    lengt=op.inValue('length',1),
    center=op.inValueBool('center',true),
    active=op.inValueBool('Active',true),
    mapping=op.inSwitch("Mapping",['Default','Cube','Cube Biased'],'Default'),
    trigger=op.outTrigger('trigger'),
    geomOut=op.outObject("geometry");

const cgl=op.patch.cgl;

op.setPortGroup("Geometry",[width,height,lengt]);

var geom=null;
var mesh=null;

mapping.onChange=buildMesh;
width.onChange=buildMesh;
height.onChange=buildMesh;
lengt.onChange=buildMesh;
center.onChange=buildMesh;

buildMesh();


render.onTriggered=function()
{
    if(active.get() && mesh) mesh.render(cgl.getShader());
    trigger.trigger();
};

op.preRender=function()
{
    buildMesh();
    mesh.render(cgl.getShader());
};

function buildMesh()
{
    if(!geom)geom=new CGL.Geometry("cubemesh");
    geom.clear();

    var x=width.get();
    var nx=-1*width.get();
    var y=lengt.get();
    var ny=-1*lengt.get();
    var z=height.get();
    var nz=-1*height.get();

    if(!center.get())
    {
        nx=0;
        ny=0;
        nz=0;
    }
    else
    {
        x*=0.5;
        nx*=0.5;
        y*=0.5;
        ny*=0.5;
        z*=0.5;
        nz*=0.5;
    }

    if(mapping.get()=="Cube" || mapping.get()=="Cube Biased")
        geom.vertices = [
            // Front face
            nx, ny,  z,
            x, ny,  z,
            x,  y,  z,
            nx,  y,  z,
            // Back face
            nx, ny, nz,
            x,  ny, nz,
            x,  y, nz,
            nx, y, nz,
            // Top face
            nx,  y, nz,
            x,  y,  nz,
            x,  y,  z,
            nx,  y, z,
            // Bottom face
            nx, ny, nz,
            x, ny, nz,
            x, ny,  z,
            nx, ny,  z,
            // Right face
            x, ny, nz,
            x, ny, z,
            x,  y, z,
            x, y, nz,
            // zeft face
            nx, ny, nz,
            nx, ny,  z,
            nx,  y,  z,
            nx,  y, nz
            ];

    else
        geom.vertices = [
            // Front face
            nx, ny,  z,
            x, ny,  z,
            x,  y,  z,
            nx,  y,  z,
            // Back face
            nx, ny, nz,
            nx,  y, nz,
            x,  y, nz,
            x, ny, nz,
            // Top face
            nx,  y, nz,
            nx,  y,  z,
            x,  y,  z,
            x,  y, nz,
            // Bottom face
            nx, ny, nz,
            x, ny, nz,
            x, ny,  z,
            nx, ny,  z,
            // Right face
            x, ny, nz,
            x,  y, nz,
            x,  y,  z,
            x, ny,  z,
            // zeft face
            nx, ny, nz,
            nx, ny,  z,
            nx,  y,  z,
            nx,  y, nz
            ];

    if(mapping.get()=="Cube" || mapping.get()=="Cube Biased")
    {
        const sx=0.25;
        const sy=1/3;
        var bias=0.0;
        if(mapping.get()=="Cube Biased")bias=0.01;
        geom.setTexCoords( [
              // Front face   Z+
              sx+bias, sy*2-bias,
              sx*2-bias, sy*2-bias,
              sx*2-bias, sy+bias,
              sx+bias, sy+bias,
              // Back face Z-
              sx*4-bias, sy*2-bias,
              sx*3+bias, sy*2-bias,
              sx*3+bias, sy+bias,
              sx*4-bias, sy+bias,
              // Top face
              sx+bias, 0+bias,
              sx*2-bias, 0+bias,
              sx*2-bias, sy*1-bias,
              sx+bias, sy*1-bias,
              // Bottom face
              sx+bias, sy*2+bias,
              sx*2-bias, sy*2+bias,
              sx*2-bias, sy*3-bias,
              sx+bias, sy*3-bias,
              // Right face
              sx*0+bias, sy+bias,
              sx*1-bias, sy+bias,
              sx*1-bias, sy*2-bias,
              sx*0+bias, sy*2-bias,
              // Left face
              sx*2+bias, sy+bias,
              sx*3-bias, sy+bias,
              sx*3-bias, sy*2-bias,
              sx*2+bias, sy*2-bias,
            ]);

    }

    else
        geom.setTexCoords( [
              // Front face
              0.0, 1.0,
              1.0, 1.0,
              1.0, 0.0,
              0.0, 0.0,
              // Back face
              1.0, 1.0,
              1.0, 0.0,
              0.0, 0.0,
              0.0, 1.0,
              // Top face
              0.0, 0.0,
              0.0, 1.0,
              1.0, 1.0,
              1.0, 0.0,
              // Bottom face
              1.0, 0.0,
              0.0, 0.0,
              0.0, 1.0,
              1.0, 1.0,
              // Right face
              1.0, 1.0,
              1.0, 0.0,
              0.0, 0.0,
              0.0, 1.0,
              // Left face
              0.0, 1.0,
              1.0, 1.0,
              1.0, 0.0,
              0.0, 0.0,
            ]);

    geom.vertexNormals = [
        // Front face
         0.0,  0.0,  1.0,
         0.0,  0.0,  1.0,
         0.0,  0.0,  1.0,
         0.0,  0.0,  1.0,

        // Back face
         0.0,  0.0, -1.0,
         0.0,  0.0, -1.0,
         0.0,  0.0, -1.0,
         0.0,  0.0, -1.0,

        // Top face
         0.0,  1.0,  0.0,
         0.0,  1.0,  0.0,
         0.0,  1.0,  0.0,
         0.0,  1.0,  0.0,

        // Bottom face
         0.0, -1.0,  0.0,
         0.0, -1.0,  0.0,
         0.0, -1.0,  0.0,
         0.0, -1.0,  0.0,

        // Right face
         1.0,  0.0,  0.0,
         1.0,  0.0,  0.0,
         1.0,  0.0,  0.0,
         1.0,  0.0,  0.0,

        // Left face
        -1.0,  0.0,  0.0,
        -1.0,  0.0,  0.0,
        -1.0,  0.0,  0.0,
        -1.0,  0.0,  0.0
    ];
    geom.tangents = [
        // front face
        -1,0,0, -1,0,0, -1,0,0, -1,0,0,
        // back face
        1,0,0, 1,0,0, 1,0,0, 1,0,0,
        // top face
        1,0,0, 1,0,0, 1,0,0, 1,0,0,
        // bottom face
        -1,0,0, -1,0,0, -1,0,0, -1,0,0,
        // right face
        0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,
        // left face
        0,0,1, 0,0,1, 0,0,1, 0,0,1
    ];
    geom.biTangents = [
        // front face
        0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0,
        // back face
        0,1,0, 0,1,0, 0,1,0, 0,1,0,
        // top face
        0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,
        // bottom face
        0,0,1, 0,0,1, 0,0,1, 0,0,1,
        // right face
        0,1,0, 0,1,0, 0,1,0, 0,1,0,
        // left face
        0,1,0, 0,1,0, 0,1,0, 0,1,0
    ];

    geom.verticesIndices = [
        0, 1, 2,      0, 2, 3,    // Front face
        4, 5, 6,      4, 6, 7,    // Back face
        8, 9, 10,     8, 10, 11,  // Top face
        12, 13, 14,   12, 14, 15, // Bottom face
        16, 17, 18,   16, 18, 19, // Right face
        20, 21, 22,   20, 22, 23  // Left face
    ];

    if(mesh)mesh.dispose();
    mesh=new CGL.Mesh(cgl,geom);
    geomOut.set(null);
    geomOut.set(geom);
}


op.onDelete=function()
{
    if(mesh)mesh.dispose();
};



};

Ops.Gl.Meshes.Cube.prototype = new CABLES.Op();
CABLES.OPS["ff0535e2-603a-4c07-9ce6-e9e0db857dfe"]={f:Ops.Gl.Meshes.Cube,objName:"Ops.Gl.Meshes.Cube"};




// **************************************************************
// 
// Ops.Points.PointsCube
// 
// **************************************************************

Ops.Points.PointsCube = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const numx=op.inValueInt("num x",5),
    numy=op.inValueInt("num y",5),
    numz=op.inValueInt("num z",5),
    mul=op.inValue("mul",1),
    center=op.inValueBool("center",true),
    outArray = op.outArray("Array out"),
    idx=op.outValue("Total points"),
    arrayLengthOut = op.outNumber("Array length");

var newArr=[];
outArray.set(newArr);

numx.onChange=
numy.onChange=
numz.onChange=
mul.onChange=
center.onChange= update;

function update()
{
    newArr.length = 0;

    var subX=0;
    var subY=0;
    var subZ=0;

    if(center.get())
    {
        subX=( (numx.get()-1)*mul.get())/2.0;
        subY=( (numy.get()-1)*mul.get())/2.0;
        subZ=( (numz.get()-1)*mul.get())/2.0;
    }

    var xTemp = 0;
    var yTemp = 0;
    var zTemp = 0;

    var m=mul.get();

    for(var z=0;z<numz.get();z++)
    {
        zTemp = (z*m) - subZ;

        for(var y=0;y<numy.get();y++)
        {
            yTemp = (y*m) - subY;

            for(var x=0;x<numx.get();x++)
            {
                xTemp = (x*m) - subX;

                newArr.push(xTemp);
                newArr.push(yTemp);
                newArr.push(zTemp);

            }
        }
    }
    idx.set(x*y*z);
    outArray.set(null);
    outArray.set(newArr);
    arrayLengthOut.set(newArr.length);
};
update();

};

Ops.Points.PointsCube.prototype = new CABLES.Op();
CABLES.OPS["6030193b-089c-4565-a7b8-d837501ded52"]={f:Ops.Points.PointsCube,objName:"Ops.Points.PointsCube"};




// **************************************************************
// 
// Ops.Gl.Matrix.TransformView
// 
// **************************************************************

Ops.Gl.Matrix.TransformView = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    render=op.inTrigger('render'),
    posX=op.inValueFloat("posX"),
    posY=op.inValueFloat("posY"),
    posZ=op.inValueFloat("posZ"),
    scale=op.inValueFloat("scale"),
    rotX=op.inValueFloat("rotX"),
    rotY=op.inValueFloat("rotY"),
    rotZ=op.inValueFloat("rotZ"),
    trigger=op.outTrigger('trigger');

op.setPortGroup("Position",[posX,posY,posZ]);
op.setPortGroup("Scale",[scale]);
op.setPortGroup("Rotation",[rotX,rotZ,rotY]);

var cgl=op.patch.cgl;
var vPos=vec3.create();
var vScale=vec3.create();
var transMatrix = mat4.create();
mat4.identity(transMatrix);

var doScale=false;
var doTranslate=false;

var translationChanged=true;
var scaleChanged=true;
var rotChanged=true;

render.onTriggered=function()
{
    var updateMatrix=false;
    if(translationChanged)
    {
        updateTranslation();
        updateMatrix=true;
    }
    if(scaleChanged)
    {
        updateScale();
        updateMatrix=true;
    }
    if(rotChanged)
    {
        updateMatrix=true;
    }
    if(updateMatrix)doUpdateMatrix();

    cgl.pushViewMatrix();
    mat4.multiply(cgl.vMatrix,cgl.vMatrix,transMatrix);

    trigger.trigger();
    cgl.popViewMatrix();

    if(op.isCurrentUiOp())
        gui.setTransformGizmo(
            {
                posX:posX,
                posY:posY,
                posZ:posZ,
            });
};

op.transform3d=function()
{
    return {
            pos:[posX,posY,posZ]
        };

};

var doUpdateMatrix=function()
{
    mat4.identity(transMatrix);
    if(doTranslate)mat4.translate(transMatrix,transMatrix, vPos);

    if(rotX.get()!==0)mat4.rotateX(transMatrix,transMatrix, rotX.get()*CGL.DEG2RAD);
    if(rotY.get()!==0)mat4.rotateY(transMatrix,transMatrix, rotY.get()*CGL.DEG2RAD);
    if(rotZ.get()!==0)mat4.rotateZ(transMatrix,transMatrix, rotZ.get()*CGL.DEG2RAD);

    if(doScale)mat4.scale(transMatrix,transMatrix, vScale);
    rotChanged=false;
};

function updateTranslation()
{
    doTranslate=false;
    if(posX.get()!==0.0 || posY.get()!==0.0 || posZ.get()!==0.0) doTranslate=true;
    vec3.set(vPos, posX.get(),posY.get(),posZ.get());
    translationChanged=false;
}

function updateScale()
{
    doScale=false;
    if(scale.get()!==0.0)doScale=true;
    vec3.set(vScale, scale.get(),scale.get(),scale.get());
    scaleChanged=false;
}

var translateChanged=function()
{
    translationChanged=true;
};

var scaleChanged=function()
{
    scaleChanged=true;
};

var rotChanged=function()
{
    rotChanged=true;
};


rotX.onChange=rotChanged;
rotY.onChange=rotChanged;
rotZ.onChange=rotChanged;

scale.onChange=scaleChanged;

posX.onChange=translateChanged;
posY.onChange=translateChanged;
posZ.onChange=translateChanged;

rotX.set(0.0);
rotY.set(0.0);
rotZ.set(0.0);

scale.set(1.0);

posX.set(0.0);
posY.set(0.0);
posZ.set(0.0);

doUpdateMatrix();



};

Ops.Gl.Matrix.TransformView.prototype = new CABLES.Op();
CABLES.OPS["0b3e04f7-323e-4ac8-8a22-a21e2f36e0e9"]={f:Ops.Gl.Matrix.TransformView,objName:"Ops.Gl.Matrix.TransformView"};




// **************************************************************
// 
// Ops.Gl.Shader.MatCapMaterialNew
// 
// **************************************************************

Ops.Gl.Shader.MatCapMaterialNew = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={matcap_frag:"\n{{MODULES_HEAD}}\n\nIN vec3 norm;\nIN vec2 texCoord;\nUNI sampler2D tex;\nIN vec3 vNorm;\nUNI mat4 viewMatrix;\n\nUNI float opacity;\n\nUNI float r;\nUNI float g;\nUNI float b;\n\nIN vec3 e;\n\n\n\n#ifdef HAS_DIFFUSE_TEXTURE\n   UNI sampler2D texDiffuse;\n#endif\n\n#ifdef USE_SPECULAR_TEXTURE\n   UNI sampler2D texSpec;\n   UNI sampler2D texSpecMatCap;\n#endif\n\n#ifdef HAS_AO_TEXTURE\n    UNI sampler2D texAo;\n    UNI float aoIntensity;\n#endif\n\n#ifdef HAS_NORMAL_TEXTURE\n   IN vec3 vBiTangent;\n   IN vec3 vTangent;\n\n   UNI sampler2D texNormal;\n   UNI mat4 normalMatrix;\n\n   vec2 vNormt;\n#endif\n\n#ifdef HAS_TEXTURE_OPACITY\n    UNI sampler2D texOpacity;\n#endif\n\n#ifdef CALC_SSNORMALS\n    // from https://www.enkisoftware.com/devlogpost-20150131-1-Normal_generation_in_the_pixel_shader\n    IN vec3 eye_relative_pos;\n#endif\n\n\nconst float normalScale=0.4;\n\nconst vec2 invAtan = vec2(0.1591, 0.3183);\nvec2 sampleSphericalMap(vec3 direction)\n{\n    vec2 uv = vec2(atan(direction.z, direction.x), asin(direction.y));\n    uv *= invAtan;\n    uv += 0.5;\n    return uv;\n}\n\n\nvoid main()\n{\n    vec2 vnOrig=vNorm.xy;\n    vec2 vn=vNorm.xy;\n\n    #ifdef PER_PIXEL\n\n        vec3 ref = reflect( e, vNorm );\n        // ref=(ref);\n\n        // ref.z+=1.;\n        // ref=normalize(ref);\n\n        // float m = 2. * sqrt(\n        //     pow(ref.x, 2.0)+\n        //     pow(ref.y, 2.0)+\n        //     pow(ref.z+1., 2.0)\n        // );\n\n        float m = 2.58284271247461903 * sqrt( (length(ref)) );\n\n        vn.xy = ref.xy / m + 0.5;\n\n\n    #endif\n\n\n\n    #ifdef HAS_TEXTURES\n        vec2 texCoords=texCoord;\n        {{MODULE_BEGIN_FRAG}}\n    #endif\n\n    #ifdef CALC_SSNORMALS\n    \tvec3 dFdxPos = dFdx( eye_relative_pos );\n    \tvec3 dFdyPos = dFdy( eye_relative_pos );\n    \tvec3 ssn = normalize( cross(dFdxPos,dFdyPos ));\n\n        vec3 rr = reflect( e, ssn );\n        float ssm = 2. * sqrt(\n            pow(rr.x, 2.0)+\n            pow(rr.y, 2.0)+\n            pow(rr.z + 1.0, 2.0)\n        );\n\n\n        vn = (rr.xy / ssm + 0.5);\n\n        vn.t=clamp(vn.t, 0.0, 1.0);\n        vn.s=clamp(vn.s, 0.0, 1.0);\n\n        // float dst = dot(abs(coord-center), vec2(1.0));\n        // float aaf = fwidth(dst);\n        // float alpha = smoothstep(radius - aaf, radius, dst);\n\n    #endif\n\n   #ifdef HAS_NORMAL_TEXTURE\n        vec3 tnorm=texture( texNormal, texCoord ).xyz * 2.0 - 1.0;\n\n        tnorm = normalize(tnorm*normalScale);\n\n        vec3 tangent;\n        vec3 binormal;\n\n        #ifdef CALC_TANGENT\n            vec3 c1 = cross(norm, vec3(0.0, 0.0, 1.0));\n//            vec3 c2 = cross(norm, vec3(0.0, 1.0, 0.0));\n//            if(length(c1)>length(c2)) tangent = c2;\n//                else tangent = c1;\n            tangent = c1;\n            tangent = normalize(tangent);\n            binormal = cross(norm, tangent);\n            binormal = normalize(binormal);\n        #endif\n\n        #ifndef CALC_TANGENT\n            tangent=normalize(vTangent);\n//            tangent.y*=-13.0;\n//            binormal=vBiTangent*norm;\n//            binormal.z*=-1.0;\n//            binormal=normalize(binormal);\n            binormal=normalize( cross( normalize(norm), normalize(vBiTangent) ));\n        // vBinormal = normalize( cross( vNormal, vTangent ) * tangent.w );\n\n        #endif\n\n        tnorm=normalize(tangent*tnorm.x + binormal*tnorm.y + norm*tnorm.z);\n\n        // vec3 n = normalize( mat3(normalMatrix) * (norm+tnorm*normalScale) );\n        vec3 n = normalize( mat3(normalMatrix) * (norm+tnorm*normalScale) );\n\n        vec3 re = reflect( e, n );\n        float m = 2. * sqrt(\n            pow(re.x, 2.0)+\n            pow(re.y, 2.0)+\n            pow(re.z + 1.0, 2.0)\n        );\n\n        vn = (re.xy / m + 0.5);\n\n    #endif\n\n// vn=clamp(vn,0.0,1.0);\n\n\n\n\n\n    vec4 col = texture( tex, vn );\n\n    #ifdef HAS_DIFFUSE_TEXTURE\n        col = col*texture( texDiffuse, texCoords);\n    #endif\n\n    col.r*=r;\n    col.g*=g;\n    col.b*=b;\n\n\n    #ifdef HAS_AO_TEXTURE\n        col = col*\n            mix(\n                vec4(1.0,1.0,1.0,1.0),\n                texture( texAo, texCoords),\n                aoIntensity\n                );\n    #endif\n\n    #ifdef USE_SPECULAR_TEXTURE\n        vec4 spec = texture( texSpecMatCap, vn );\n        spec*= texture( texSpec, texCoords );\n        col+=spec;\n    #endif\n\n    col.a*=opacity;\n    #ifdef HAS_TEXTURE_OPACITY\n            #ifdef TRANSFORMALPHATEXCOORDS\n                texCoords=vec2(texCoord.s,1.0-texCoord.t);\n            #endif\n            #ifdef ALPHA_MASK_ALPHA\n                col.a*=texture(texOpacity,texCoords).a;\n            #endif\n            #ifdef ALPHA_MASK_LUMI\n                col.a*=dot(vec3(0.2126,0.7152,0.0722), texture(texOpacity,texCoords).rgb);\n            #endif\n            #ifdef ALPHA_MASK_R\n                col.a*=texture(texOpacity,texCoords).r;\n            #endif\n            #ifdef ALPHA_MASK_G\n                col.a*=texture(texOpacity,texCoords).g;\n            #endif\n            #ifdef ALPHA_MASK_B\n                col.a*=texture(texOpacity,texCoords).b;\n            #endif\n            // #endif\n    #endif\n\n    {{MODULE_COLOR}}\n\n\n    // #ifdef PER_PIXEL\n\n\n    //     vec2 nn=(vn-0.5)*2.0;\n    //     float ll=length( nn );\n    //     // col.r=0.0;\n    //     // col.b=0.0;\n    //     // col.a=1.0;\n\n    //     // if(ll>0.49 && ll<0.51) col=vec4(0.0,1.0,0.0,1.0);\n    //     // if(ll>0. ) col=vec4(0.0,1.0,0.0,1.0);\n    //     // col=vec4(vn,0.0,1.0);\n\n\n    //     float dd=(vn.x-0.5)*(vn.x-0.5) + (vn.y-0.5)*(vn.y-0.5);\n    //     dd*=4.0;\n\n    //     if(dd>0.94)\n    //     {\n    //     col=vec4(0.0,1.0,0.0,1.0);\n    //         // nn*=0.5;\n    //         // nn+=0.5;\n    //         // nn*=2.0;\n    //         // vn=nn;\n\n    //         // // dd=1.0;\n    //     }\n    //     // else dd=0.0;\n\n    //     // col=vec4(vec3(dd),1.0);\n\n    //     // if(dd>0.95) col=vec4(1.0,0.0,0.0,1.0);\n\n    //     // vec2 test=(vec2(1.0,1.0)-0.5)*2.0;\n    //     // col=vec4(0.0,0.0,length(test),1.0);\n\n    // #endif\n\n\n\n    outColor = col;\n\n}",matcap_vert:"\nIN vec3 vPosition;\nIN vec2 attrTexCoord;\nIN vec3 attrVertNormal;\nIN float attrVertIndex;\nIN vec3 attrTangent;\nIN vec3 attrBiTangent;\n\n#ifdef HAS_NORMAL_TEXTURE\n\n   OUT vec3 vBiTangent;\n   OUT vec3 vTangent;\n#endif\n\nOUT vec2 texCoord;\nOUT vec3 norm;\nUNI mat4 projMatrix;\nUNI mat4 modelMatrix;\nUNI mat4 viewMatrix;\n\nOUT vec3 vNorm;\nOUT vec3 e;\n\nUNI vec2 texOffset;\nUNI vec2 texRepeat;\n\n\n#ifndef INSTANCING\n    UNI mat4 normalMatrix;\n#endif\n\n\n{{MODULES_HEAD}}\n\n#ifdef CALC_SSNORMALS\n    // from https://www.enkisoftware.com/devlogpost-20150131-1-Normal_generation_in_the_pixel_shader\n    OUT vec3 eye_relative_pos;\n#endif\n\nUNI vec3 camPos;\n\n\n// mat3 transposeMat3(mat3 m)\n// {\n//     return mat3(m[0][0], m[1][0], m[2][0],\n//         m[0][1], m[1][1], m[2][1],\n//         m[0][2], m[1][2], m[2][2]);\n// }\n\n// mat3 inverseMat3(mat3 m)\n// {\n//     float a00 = m[0][0], a01 = m[0][1], a02 = m[0][2];\n//     float a10 = m[1][0], a11 = m[1][1], a12 = m[1][2];\n//     float a20 = m[2][0], a21 = m[2][1], a22 = m[2][2];\n\n//     float b01 = a22 * a11 - a12 * a21;\n//     float b11 = -a22 * a10 + a12 * a20;\n//     float b21 = a21 * a10 - a11 * a20;\n\n//     float det = a00 * b01 + a01 * b11 + a02 * b21;\n\n//     return mat3(b01, (-a22 * a01 + a02 * a21), (a12 * a01 - a02 * a11),\n//         b11, (a22 * a00 - a02 * a20), (-a12 * a00 + a02 * a10),\n//         b21, (-a21 * a00 + a01 * a20), (a11 * a00 - a01 * a10)) / det;\n// }\n\nvoid main()\n{\n    texCoord=texRepeat*attrTexCoord+texOffset;\n    norm=attrVertNormal;\n    mat4 mMatrix=modelMatrix;\n    mat4 mvMatrix;\n    vec3 tangent=attrTangent;\n    vec3 bitangent=attrBiTangent;\n\n    #ifdef HAS_NORMAL_TEXTURE\n        vTangent=attrTangent;\n        vBiTangent=attrBiTangent;\n    #endif\n\n    vec4 pos = vec4( vPosition, 1. );\n\n    {{MODULE_VERTEX_POSITION}}\n\n\n    mvMatrix= viewMatrix * mMatrix;\n\n    #ifdef INSTANCING\n        mat4 normalMatrix=mvMatrix;//inverse(transpose(mvMatrix));\n        // mat4 normalMatrix = mat4(transposeMat3(inverseMat3(mat3(mMatrix))));\n\n    #endif\n\n\n    mat3 wmMatrix=mat3(mMatrix);\n\n    e = normalize( vec3( mvMatrix * pos )  );\n    vec3 n = normalize( mat3(normalMatrix*viewMatrix) * (norm) );\n\n    #ifdef PER_PIXEL\n        vNorm=n;\n    #endif\n    #ifndef PER_PIXEL\n        //matcap\n        vec3 r = reflect( e, n );\n\n        // float m = 2. * sqrt(\n        //     pow(r.x, 2.0)+\n        //     pow(r.y, 2.0)+\n        //     pow(r.z + 1.0, 2.0)\n        // );\n\n        float m = 2.58284271247461903 * sqrt(length(r));\n\n        vNorm.xy = r.xy / m + 0.5;\n\n    #endif\n\n\n\n    #ifdef DO_PROJECT_COORDS_XY\n       texCoord=(projMatrix * mvMatrix*pos).xy*0.1;\n    #endif\n\n    #ifdef DO_PROJECT_COORDS_YZ\n       texCoord=(projMatrix * mvMatrix*pos).yz*0.1;\n    #endif\n\n    #ifdef DO_PROJECT_COORDS_XZ\n        texCoord=(projMatrix * mvMatrix*pos).xz*0.1;\n    #endif\n\n    #ifdef CALC_SSNORMALS\n        eye_relative_pos = (mvMatrix * pos ).xyz - camPos;\n    #endif\n\n\n\n   gl_Position = projMatrix * mvMatrix * pos;\n\n}",};
const
    render=op.inTrigger("render"),
    textureMatcap=op.inTexture('MatCap'),
    textureDiffuse=op.inTexture('Diffuse'),
    textureNormal=op.inTexture('Normal'),
    textureSpec=op.inTexture('Specular'),
    textureSpecMatCap=op.inTexture('Specular MatCap'),
    textureAo=op.inTexture('AO Texture'),
    textureOpacity=op.inTexture("Opacity Texture"),
    r=op.inValueSlider('r',1),
    g=op.inValueSlider('g',1),
    b=op.inValueSlider('b',1),
    pOpacity=op.inValueSlider("Opacity",1),
    aoIntensity=op.inValueSlider("AO Intensity",1.0),
    repeatX=op.inValue("Repeat X",1),
    repeatY=op.inValue("Repeat Y",1),
    offsetX=op.inValue("Offset X",0),
    offsetY=op.inValue("Offset Y",0),
    calcTangents = op.inValueBool("calc normal tangents",true),
    projectCoords=op.inValueSelect('projectCoords',['no','xy','yz','xz'],'no'),
    ssNormals=op.inValueBool("Screen Space Normals"),
    next=op.outTrigger("trigger"),
    shaderOut=op.outObject("Shader");

r.setUiAttribs({colorPick:true});

const alphaMaskSource=op.inSwitch("Alpha Mask Source",["Luminance","R","G","B","A"],"Luminance");
alphaMaskSource.setUiAttribs({ greyout:true });

const texCoordAlpha=op.inValueBool("Opacity TexCoords Transform",false);
const discardTransPxl=op.inValueBool("Discard Transparent Pixels");

op.setPortGroup("Texture Opacity",[alphaMaskSource, texCoordAlpha, discardTransPxl]);
op.setPortGroup("Texture maps",[textureDiffuse,textureNormal,textureSpec,textureSpecMatCap,textureAo, textureOpacity]);
op.setPortGroup("Color",[r,g,b,pOpacity]);

const cgl=op.patch.cgl;
const shader=new CGL.Shader(cgl,'MatCapMaterialNew');
var uniOpacity=new CGL.Uniform(shader,'f','opacity',pOpacity);

shader.setModules(['MODULE_VERTEX_POSITION','MODULE_COLOR','MODULE_BEGIN_FRAG']);
shader.setSource(attachments.matcap_vert,attachments.matcap_frag);
shaderOut.set(shader);

var textureMatcapUniform=null;
var textureDiffuseUniform=null;
var textureNormalUniform=null;
var textureSpecUniform=null;
var textureSpecMatCapUniform=null;
var textureAoUniform=null;
const offsetUniform=new CGL.Uniform(shader,'2f','texOffset',offsetX,offsetY);
const repeatUniform=new CGL.Uniform(shader,'2f','texRepeat',repeatX,repeatY);

var aoIntensityUniform=new CGL.Uniform(shader,'f','aoIntensity',aoIntensity);
b.uniform=new CGL.Uniform(shader,'f','b',b);
g.uniform=new CGL.Uniform(shader,'f','g',g);
r.uniform=new CGL.Uniform(shader,'f','r',r);


calcTangents.onChange=updateDefines;
updateDefines();
updateMatcap();

function updateDefines()
{
    if(calcTangents.get()) shader.define('CALC_TANGENT');
        else shader.removeDefine('CALC_TANGENT');

}

ssNormals.onChange=function()
{
    if(ssNormals.get())
    {
        if(cgl.glVersion<2)
        {
            cgl.gl.getExtension('OES_standard_derivatives');
            shader.enableExtension('GL_OES_standard_derivatives');
        }

        shader.define('CALC_SSNORMALS');
    }
    else shader.removeDefine('CALC_SSNORMALS');
};

projectCoords.onChange=function()
{
    shader.toggleDefine('DO_PROJECT_COORDS_XY',projectCoords.get()=='xy');
    shader.toggleDefine('DO_PROJECT_COORDS_YZ',projectCoords.get()=='yz');
    shader.toggleDefine('DO_PROJECT_COORDS_XZ',projectCoords.get()=='xz');
};

textureMatcap.onChange=updateMatcap;

function updateMatcap()
{
    if(textureMatcap.get())
    {
        if(textureMatcapUniform!==null)return;
        shader.removeUniform('tex');
        textureMatcapUniform=new CGL.Uniform(shader,'t','tex',0);
    }
    else
    {
        if(!CGL.defaultTextureMap)
        {
            var pixels=new Uint8Array(256*4);
            for(var x=0;x<16;x++)
            {
                for(var y=0;y<16;y++)
                {
                    var c=y*16;
                    c*=Math.min(1,(x+y/3)/8);
                    pixels[(x+y*16)*4+0]=pixels[(x+y*16)*4+1]=pixels[(x+y*16)*4+2]=c;
                    pixels[(x+y*16)*4+3]=255;
                }
            }

            CGL.defaultTextureMap=new CGL.Texture(cgl);
            CGL.defaultTextureMap.initFromData(pixels,16,16);
        }
        textureMatcap.set(CGL.defaultTextureMap);

        shader.removeUniform('tex');
        textureMatcapUniform=new CGL.Uniform(shader,'t','tex',0);
    }
}

textureDiffuse.onChange=function()
{
    if(textureDiffuse.get())
    {
        if(textureDiffuseUniform!==null)return;
        shader.define('HAS_DIFFUSE_TEXTURE');
        shader.removeUniform('texDiffuse');
        textureDiffuseUniform=new CGL.Uniform(shader,'t','texDiffuse',1);
    }
    else
    {
        shader.removeDefine('HAS_DIFFUSE_TEXTURE');
        shader.removeUniform('texDiffuse');
        textureDiffuseUniform=null;
    }
};

textureNormal.onChange=function()
{
    if(textureNormal.get())
    {
        if(textureNormalUniform!==null)return;
        shader.define('HAS_NORMAL_TEXTURE');
        shader.removeUniform('texNormal');
        textureNormalUniform=new CGL.Uniform(shader,'t','texNormal',2);
    }
    else
    {
        shader.removeDefine('HAS_NORMAL_TEXTURE');
        shader.removeUniform('texNormal');
        textureNormalUniform=null;
    }
};

textureAo.onChange=function()
{
    if(textureAo.get())
    {
        if(textureAoUniform!==null)return;
        shader.define('HAS_AO_TEXTURE');
        shader.removeUniform('texAo');
        textureAoUniform=new CGL.Uniform(shader,'t','texAo',5);
    }
    else
    {
        shader.removeDefine('HAS_AO_TEXTURE');
        shader.removeUniform('texAo');
        textureAoUniform=null;
    }
};

textureSpec.onChange=textureSpecMatCap.onChange=function()
{
    if(textureSpec.get() && textureSpecMatCap.get())
    {
        if(textureSpecUniform!==null)return;
        shader.define('USE_SPECULAR_TEXTURE');
        shader.removeUniform('texSpec');
        shader.removeUniform('texSpecMatCap');
        textureSpecUniform=new CGL.Uniform(shader,'t','texSpec',3);
        textureSpecMatCapUniform=new CGL.Uniform(shader,'t','texSpecMatCap',4);
    }
    else
    {
        shader.removeDefine('USE_SPECULAR_TEXTURE');
        shader.removeUniform('texSpec');
        shader.removeUniform('texSpecMatCap');
        textureSpecUniform=null;
        textureSpecMatCapUniform=null;
    }
};

// TEX OPACITY

function updateAlphaMaskMethod()
{
    if(alphaMaskSource.get()=='Alpha Channel') shader.define('ALPHA_MASK_ALPHA');
        else shader.removeDefine('ALPHA_MASK_ALPHA');

    if(alphaMaskSource.get()=='Luminance') shader.define('ALPHA_MASK_LUMI');
        else shader.removeDefine('ALPHA_MASK_LUMI');

    if(alphaMaskSource.get()=='R') shader.define('ALPHA_MASK_R');
        else shader.removeDefine('ALPHA_MASK_R');

    if(alphaMaskSource.get()=='G') shader.define('ALPHA_MASK_G');
        else shader.removeDefine('ALPHA_MASK_G');

    if(alphaMaskSource.get()=='B') shader.define('ALPHA_MASK_B');
        else shader.removeDefine('ALPHA_MASK_B');
}
alphaMaskSource.onChange=updateAlphaMaskMethod;

var textureOpacityUniform = null;

function updateOpacity()
{

    if(textureOpacity.get())
    {
        if(textureOpacityUniform!==null)return;
        shader.removeUniform('texOpacity');
        shader.define('HAS_TEXTURE_OPACITY');
        if(!textureOpacityUniform) textureOpacityUniform=new CGL.Uniform(shader,'t','texOpacity',6);

        alphaMaskSource.setUiAttribs({greyout:false});
        discardTransPxl.setUiAttribs({greyout:false});
        texCoordAlpha.setUiAttribs({greyout:false});

    }
    else
    {
        shader.removeUniform('texOpacity');
        shader.removeDefine('HAS_TEXTURE_OPACITY');
        textureOpacityUniform=null;

        alphaMaskSource.setUiAttribs({greyout:true});
        discardTransPxl.setUiAttribs({greyout:true});
        texCoordAlpha.setUiAttribs({greyout:true});
    }
    updateAlphaMaskMethod();
};
textureOpacity.onChange=updateOpacity;

discardTransPxl.onChange=function()
{
    if(discardTransPxl.get()) shader.define('DISCARDTRANS');
        else shader.removeDefine('DISCARDTRANS');
};


texCoordAlpha.onChange=function()
{
    if(texCoordAlpha.get()) shader.define('TRANSFORMALPHATEXCOORDS');
        else shader.removeDefine('TRANSFORMALPHATEXCOORDS');
};

// function bindTextures()
// {
//      if(textureMatcap.get())     cgl.setTexture(0,textureMatcap.get().tex);
//      if(textureDiffuse.get())    cgl.setTexture(1,textureDiffuse.get().tex);
//      if(textureNormal.get())     cgl.setTexture(2,textureNormal.get().tex);
//      if(textureSpec.get())       cgl.setTexture(3,textureSpec.get().tex);
//      if(textureSpecMatCap.get()) cgl.setTexture(4,textureSpecMatCap.get().tex);
//      if(textureAo.get())         cgl.setTexture(5,textureAo.get().tex);
//      if(textureOpacity.get())    cgl.setTexture(6, textureOpacity.get().tex);
// };

op.onDelete=function()
{
    if(CGL.defaultTextureMap)
    {
        CGL.defaultTextureMap.delete();
        CGL.defaultTextureMap=null;
    }
};

op.preRender=function()
{
    shader.bind();
};

render.onTriggered=function()
{
    // shader.bindTextures=bindTextures;

    shader.popTextures();
    if(textureMatcap.get() && textureMatcapUniform)     shader.pushTexture(textureMatcapUniform,textureMatcap.get().tex);
    if(textureDiffuse.get() && textureDiffuseUniform)    shader.pushTexture(textureDiffuseUniform,textureDiffuse.get().tex);
    if(textureNormal.get() && textureNormalUniform)     shader.pushTexture(textureNormalUniform,textureNormal.get().tex);
    if(textureSpec.get() && textureSpecUniform)       shader.pushTexture(textureSpecUniform,textureSpec.get().tex);
    if(textureSpecMatCap.get() && textureSpecMatCapUniform) shader.pushTexture(textureSpecMatCapUniform,textureSpecMatCap.get().tex);
    if(textureAo.get() && textureAoUniform)         shader.pushTexture(textureAoUniform,textureAo.get().tex);
    if(textureOpacity.get() && textureOpacityUniform)    shader.pushTexture(textureOpacityUniform, textureOpacity.get().tex);


    cgl.pushShader(shader);
    next.trigger();
    cgl.popShader();
};



};

Ops.Gl.Shader.MatCapMaterialNew.prototype = new CABLES.Op();
CABLES.OPS["7857ee9e-6d60-4c30-9bc0-dfdddf2b47ad"]={f:Ops.Gl.Shader.MatCapMaterialNew,objName:"Ops.Gl.Shader.MatCapMaterialNew"};




// **************************************************************
// 
// Ops.Array.RandomNumbersArray3
// 
// **************************************************************

Ops.Array.RandomNumbersArray3 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    numValues=op.inValueInt("numValues",100),
    min=op.inValueFloat("Min",-1),
    max=op.inValueFloat("Max",1),
    seed=op.inValueFloat("random seed"),
    closed=op.inValueBool("Last == First"),
    inInteger=op.inValueBool("Integer",false),
    values=op.outArray("values"),
    outTotalPoints = op.outNumber("Total points"),
    outArrayLength = op.outNumber("Array length");

op.setPortGroup("Value Range",[min,max]);
op.setPortGroup("",[seed,closed]);

values.ignoreValueSerialize=true;

closed.onChange=max.onChange=
    min.onChange=
    numValues.onChange=
    seed.onChange=
    values.onLinkChanged=
    inInteger.onChange=init;

var arr=[];
init();

function init()
{
    Math.randomSeed=seed.get();

    var isInteger=inInteger.get();

    var arrLength = arr.length=Math.floor(Math.abs(numValues.get()*3));
    for(var i=0;i<arrLength;i+=3)
    {
        if(!isInteger)
        {
            arr[i+0]=Math.seededRandom() * ( max.get() - min.get() ) + min.get() ;
            arr[i+1]=Math.seededRandom() * ( max.get() - min.get() ) + min.get() ;
            arr[i+2]=Math.seededRandom() * ( max.get() - min.get() ) + min.get() ;
        }
        else
        {
            arr[i+0]=Math.floor(Math.seededRandom() * ( max.get() - min.get() ) + min.get()) ;
            arr[i+1]=Math.floor(Math.seededRandom() * ( max.get() - min.get() ) + min.get()) ;
            arr[i+2]=Math.floor(Math.seededRandom() * ( max.get() - min.get() ) + min.get()) ;
        }
    }

    if(closed.get() && arrLength>3)
    {
        arr[arrLength-3+0]=arr[0];
        arr[arrLength-3+1]=arr[1];
        arr[arrLength-3+2]=arr[2];
    }

    values.set(null);
    values.set(arr);
    outTotalPoints.set(arrLength/3);
    outArrayLength.set(arrLength);
};


};

Ops.Array.RandomNumbersArray3.prototype = new CABLES.Op();
CABLES.OPS["7f981578-542e-417b-b304-8fbe41258772"]={f:Ops.Array.RandomNumbersArray3,objName:"Ops.Array.RandomNumbersArray3"};




// **************************************************************
// 
// Ops.Gl.Matrix.OrbitControls
// 
// **************************************************************

Ops.Gl.Matrix.OrbitControls = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const render = op.inTrigger("render");
const minDist = op.inValueFloat("min distance");
const maxDist = op.inValueFloat("max distance");

const minRotY = op.inValue("min rot y", 0);
const maxRotY = op.inValue("max rot y", 0);

// const minRotX=op.inValue("min rot x",0);
// const maxRotX=op.inValue("max rot x",0);

const initialRadius = op.inValue("initial radius", 0);
const initialAxis = op.inValueSlider("initial axis y");
const initialX = op.inValueSlider("initial axis x");

const mul = op.inValueFloat("mul");
const smoothness = op.inValueSlider("Smoothness", 1.0);
const speedX = op.inValue("Speed X", 1);
const speedY = op.inValue("Speed Y", 1);

const active = op.inValueBool("Active", true);

const allowPanning = op.inValueBool("Allow Panning", true);
const allowZooming = op.inValueBool("Allow Zooming", true);
const allowRotation = op.inValueBool("Allow Rotation", true);
const restricted = op.inValueBool("restricted", true);
const pointerLock = op.inValueBool("Pointerlock", false);

const trigger = op.outTrigger("trigger");
const outRadius = op.outValue("radius");
const outXDeg = op.outValue("Rot X");
const outYDeg = op.outValue("Rot Y");


// const
//     outPosX=op.outNumber("Eye Pos X"),
//     outPosY=op.outNumber("Eye Pos Y"),
//     outPosZ=op.outNumber("Eye Pos Z");

const inReset = op.inTriggerButton("Reset");

op.setPortGroup("Initial Values", [initialAxis, initialX, initialRadius]);
op.setPortGroup("Interaction", [mul, smoothness, speedX, speedY]);
op.setPortGroup("Boundaries", [minRotY, maxRotY, minDist, maxDist]);


mul.set(1);
minDist.set(0.05);
maxDist.set(99999);

inReset.onTriggered = reset;

const cgl = op.patch.cgl;
let eye = vec3.create();
const vUp = vec3.create();
const vCenter = vec3.create();
const viewMatrix = mat4.create();
const tempViewMatrix = mat4.create();
const vOffset = vec3.create();
const finalEyeAbs = vec3.create();

initialAxis.set(0.5);


let mouseDown = false;
let radius = 5;
outRadius.set(radius);

let lastMouseX = 0, lastMouseY = 0;
let percX = 0, percY = 0;


vec3.set(vCenter, 0, 0, 0);
vec3.set(vUp, 0, 1, 0);

const tempEye = vec3.create();
const finalEye = vec3.create();
const tempCenter = vec3.create();
const finalCenter = vec3.create();

let px = 0;
let py = 0;

let divisor = 1;
let element = null;
updateSmoothness();

op.onDelete = unbind;

let doLockPointer = false;

pointerLock.onChange = function ()
{
    doLockPointer = pointerLock.get();
    console.log("doLockPointer", doLockPointer);
};


const halfCircle = Math.PI;
const fullCircle = Math.PI * 2;

function reset()
{
    let off = 0;

    if (px % fullCircle < -halfCircle)
    {
        off = -fullCircle;
        px %= -fullCircle;
        // console.log("MINUS YES");
    }
    else
    if (px % fullCircle > halfCircle)
    {
        off = fullCircle;
        px %= fullCircle;
        // console.log("PLUSS YES");
    }
    else px %= fullCircle;

    py %= (Math.PI);


    vec3.set(vOffset, 0, 0, 0);
    vec3.set(vCenter, 0, 0, 0);
    vec3.set(vUp, 0, 1, 0);

    percX = (initialX.get() * Math.PI * 2 + off);
    percY = (initialAxis.get() - 0.5);

    radius = initialRadius.get();
    eye = circlePos(percY);
}

function updateSmoothness()
{
    divisor = smoothness.get() * 10 + 1.0;
}

smoothness.onChange = updateSmoothness;

let initializing = true;

function ip(val, goal)
{
    if (initializing) return goal;
    return val + (goal - val) / divisor;
}

let lastPy = 0;
const lastPx = 0;

render.onTriggered = function ()
{
    // if (cgl.frameStore.shadowPass) return trigger.trigger();

    cgl.pushViewMatrix();

    px = ip(px, percX);
    py = ip(py, percY);

    let degY = (py + 0.5) * 180;


    if (minRotY.get() !== 0 && degY < minRotY.get())
    {
        degY = minRotY.get();
        py = lastPy;
    }
    else if (maxRotY.get() !== 0 && degY > maxRotY.get())
    {
        degY = maxRotY.get();
        py = lastPy;
    }
    else
    {
        lastPy = py;
    }

    const degX = (px) * CGL.RAD2DEG;

    outYDeg.set(degY);
    outXDeg.set(degX);

    circlePosi(eye, py);

    vec3.add(tempEye, eye, vOffset);
    vec3.add(tempCenter, vCenter, vOffset);

    finalEye[0] = ip(finalEye[0], tempEye[0]);
    finalEye[1] = ip(finalEye[1], tempEye[1]);
    finalEye[2] = ip(finalEye[2], tempEye[2]);

    finalCenter[0] = ip(finalCenter[0], tempCenter[0]);
    finalCenter[1] = ip(finalCenter[1], tempCenter[1]);
    finalCenter[2] = ip(finalCenter[2], tempCenter[2]);


    const empty = vec3.create();
    // var fpm=mat4.create();

    // mat4.translate(fpm, fpm, finalEye);
    // mat4.rotate(fpm, fpm, px, vUp);
    // mat4.multiply(fpm,fpm, cgl.vMatrix);
    // vec3.transformMat4(finalEyeAbs, empty, fpm);

    // outPosX.set(finalEyeAbs[0]);
    // outPosY.set(finalEyeAbs[1]);
    // outPosZ.set(finalEyeAbs[2]);


    mat4.lookAt(viewMatrix, finalEye, finalCenter, vUp);
    mat4.rotate(viewMatrix, viewMatrix, px, vUp);

    // finaly multiply current scene viewmatrix
    mat4.multiply(cgl.vMatrix, cgl.vMatrix, viewMatrix);


    // vec3.transformMat4(finalEyeAbs, empty, cgl.vMatrix);

    // outPosX.set(finalEyeAbs[0]);
    // outPosY.set(finalEyeAbs[1]);
    // outPosZ.set(finalEyeAbs[2]);


    // var fpm=mat4.create();
    // mat4.identity(fpm);
    // mat4.translate(fpm,fpm,finalEye);
    // mat4.rotate(fpm, fpm, px, vUp);
    // mat4.multiply(fpm,fpm,cgl.vMatrix);

    // // vec3.copy(finalEyeAbs,finalEye);
    // // vec3.set(finalEyeAbs,0,1,0);
    // // mat4.rotate(viewMatrix, viewMatrix, px, vUp);
    // // vec3.transformMat4( finalEyeAbs, finalEye, fpm );

    // // vec3.transformMat4( finalEyeAbs, finalEyeAbs, cgl.vMatrix );
    // // mat4.getTranslation(finalEyeAbs,fpm);
    // var pos=vec3.create();
    // vec3.transformMat4(finalEyeAbs, empty, fpm);


    // outPosX.set(finalEyeAbs[0]);
    // outPosY.set(finalEyeAbs[1]);
    // outPosZ.set(finalEyeAbs[2]);

    trigger.trigger();
    cgl.popViewMatrix();
    initializing = false;
};

function circlePosi(vec, perc)
{
    const mmul = mul.get();
    if (radius < minDist.get() * mmul) radius = minDist.get() * mmul;
    if (radius > maxDist.get() * mmul) radius = maxDist.get() * mmul;

    outRadius.set(radius * mmul);

    let i = 0, degInRad = 0;
    // var vec=vec3.create();
    degInRad = 360 * perc / 2 * CGL.DEG2RAD;
    vec3.set(vec,
        Math.cos(degInRad) * radius * mmul,
        Math.sin(degInRad) * radius * mmul,
        0);
    return vec;
}


function circlePos(perc)
{
    const mmul = mul.get();
    if (radius < minDist.get() * mmul)radius = minDist.get() * mmul;
    if (radius > maxDist.get() * mmul)radius = maxDist.get() * mmul;

    outRadius.set(radius * mmul);

    let i = 0, degInRad = 0;
    const vec = vec3.create();
    degInRad = 360 * perc / 2 * CGL.DEG2RAD;
    vec3.set(vec,
        Math.cos(degInRad) * radius * mmul,
        Math.sin(degInRad) * radius * mmul,
        0);
    return vec;
}

function onmousemove(event)
{
    if (!mouseDown) return;

    const x = event.clientX;
    const y = event.clientY;

    let movementX = (x - lastMouseX);
    let movementY = (y - lastMouseY);

    if (doLockPointer)
    {
        movementX = event.movementX * mul.get();
        movementY = event.movementY * mul.get();
    }

    movementX *= speedX.get();
    movementY *= speedY.get();

    if (event.which == 3 && allowPanning.get())
    {
        vOffset[2] += movementX * 0.01 * mul.get();
        vOffset[1] += movementY * 0.01 * mul.get();
    }
    else
    if (event.which == 2 && allowZooming.get())
    {
        radius += movementY * 0.05;
        eye = circlePos(percY);
    }
    else
    {
        if (allowRotation.get())
        {
            percX += movementX * 0.003;
            percY += movementY * 0.002;

            if (restricted.get())
            {
                if (percY > 0.5)percY = 0.5;
                if (percY < -0.5)percY = -0.5;
            }
        }
    }

    lastMouseX = x;
    lastMouseY = y;
}

function onMouseDown(event)
{
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
    mouseDown = true;

    if (doLockPointer)
    {
        const el = op.patch.cgl.canvas;
        el.requestPointerLock = el.requestPointerLock || el.mozRequestPointerLock || el.webkitRequestPointerLock;
        if (el.requestPointerLock) el.requestPointerLock();
        else console.log("no t found");
        // document.addEventListener("mousemove", onmousemove, false);

        document.addEventListener("pointerlockchange", lockChange, false);
        document.addEventListener("mozpointerlockchange", lockChange, false);
        document.addEventListener("webkitpointerlockchange", lockChange, false);
    }
}

function onMouseUp()
{
    mouseDown = false;
    // cgl.canvas.style.cursor='url(/ui/img/rotate.png),pointer';

    if (doLockPointer)
    {
        document.removeEventListener("pointerlockchange", lockChange, false);
        document.removeEventListener("mozpointerlockchange", lockChange, false);
        document.removeEventListener("webkitpointerlockchange", lockChange, false);

        if (document.exitPointerLock) document.exitPointerLock();
        document.removeEventListener("mousemove", pointerLock, false);
    }
}

function lockChange()
{
    const el = op.patch.cgl.canvas;

    if (document.pointerLockElement === el || document.mozPointerLockElement === el || document.webkitPointerLockElement === el)
    {
        document.addEventListener("mousemove", onmousemove, false);
        console.log("listening...");
    }
}

function onMouseEnter(e)
{
    // cgl.canvas.style.cursor='url(/ui/img/rotate.png),pointer';
}

initialRadius.onChange = function ()
{
    radius = initialRadius.get();
    reset();
};

initialX.onChange = function ()
{
    px = percX = (initialX.get() * Math.PI * 2);
};

initialAxis.onChange = function ()
{
    py = percY = (initialAxis.get() - 0.5);
    eye = circlePos(percY);
};

const onMouseWheel = function (event)
{
    if (allowZooming.get())
    {
        const delta = CGL.getWheelSpeed(event) * 0.06;
        radius += (parseFloat(delta)) * 1.2;

        eye = circlePos(percY);
        // event.preventDefault();
    }
};

const ontouchstart = function (event)
{
    doLockPointer = false;
    if (event.touches && event.touches.length > 0) onMouseDown(event.touches[0]);
};

const ontouchend = function (event)
{
    doLockPointer = false;
    onMouseUp();
};

const ontouchmove = function (event)
{
    doLockPointer = false;
    if (event.touches && event.touches.length > 0) onmousemove(event.touches[0]);
};

active.onChange = function ()
{
    if (active.get())bind();
    else unbind();
};

function setElement(ele)
{
    unbind();
    element = ele;
    bind();
}

function bind()
{
    element.addEventListener("mousemove", onmousemove);
    element.addEventListener("mousedown", onMouseDown);
    element.addEventListener("mouseup", onMouseUp);
    element.addEventListener("mouseleave", onMouseUp);
    element.addEventListener("mouseenter", onMouseEnter);
    element.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    element.addEventListener("wheel", onMouseWheel, { "passive": true });

    element.addEventListener("touchmove", ontouchmove, { "passive": true });
    element.addEventListener("touchstart", ontouchstart, { "passive": true });
    element.addEventListener("touchend", ontouchend, { "passive": true });
}

function unbind()
{
    if (!element) return;

    element.removeEventListener("mousemove", onmousemove);
    element.removeEventListener("mousedown", onMouseDown);
    element.removeEventListener("mouseup", onMouseUp);
    element.removeEventListener("mouseleave", onMouseUp);
    element.removeEventListener("mouseenter", onMouseUp);
    element.removeEventListener("wheel", onMouseWheel);

    element.removeEventListener("touchmove", ontouchmove);
    element.removeEventListener("touchstart", ontouchstart);
    element.removeEventListener("touchend", ontouchend);
}

eye = circlePos(0);
setElement(cgl.canvas);


bind();

initialX.set(0.25);
initialRadius.set(0.05);


};

Ops.Gl.Matrix.OrbitControls.prototype = new CABLES.Op();
CABLES.OPS["eaf4f7ce-08a3-4d1b-b9f4-ebc0b7b1cde1"]={f:Ops.Gl.Matrix.OrbitControls,objName:"Ops.Gl.Matrix.OrbitControls"};




// **************************************************************
// 
// Ops.Trigger.TriggerOnce
// 
// **************************************************************

Ops.Trigger.TriggerOnce = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    exe=op.inTriggerButton("Exec"),
    reset=op.inTriggerButton("Reset"),
    next=op.outTrigger("Next");
var outTriggered=op.outValue("Was Triggered");

var triggered=false;

op.toWorkPortsNeedToBeLinked(exe);

reset.onTriggered=function()
{
    triggered=false;
    outTriggered.set(triggered);
};

exe.onTriggered=function()
{
    if(triggered)return;

    triggered=true;
    next.trigger();
    outTriggered.set(triggered);

};

};

Ops.Trigger.TriggerOnce.prototype = new CABLES.Op();
CABLES.OPS["cf3544e4-e392-432b-89fd-fcfb5c974388"]={f:Ops.Trigger.TriggerOnce,objName:"Ops.Trigger.TriggerOnce"};




// **************************************************************
// 
// Ops.Array.ArrayUnpack3
// 
// **************************************************************

Ops.Array.ArrayUnpack3 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const inArray1=op.inArray("Array in xyz"),
    outArray1=op.outArray("Array 1 out"),
    outArray2=op.outArray("Array 2 out"),
    outArray3=op.outArray("Array 3 out"),
    outArrayLength = op.outNumber("Array lengths");

var showingError = false;

const arr1=[];
const arr2=[];
const arr3=[];

inArray1.onChange = update;

function update()
{
    var array1=inArray1.get();

    if(!array1)
    {
        outArray1.set(null);
        return;
    }

    if(array1.length % 3 !== 0)
    {
        if(!showingError)
        {
            op.uiAttr({error:"Arrays length not divisible by 3 !"});
            outArrayLength.set(0);
            showingError = true;
        }
        return;
    }

    if(showingError)
    {
        showingError = false;
        op.uiAttr({error:null});
    }

    arr1.length = Math.floor(array1.length/3);
    arr2.length = Math.floor(array1.length/3);
    arr3.length = Math.floor(array1.length/3);

    for(var i=0;i<array1.length/3;i++)
    {
        arr1[i] = array1[i*3];
        arr2[i] = array1[i*3+1];
        arr3[i] = array1[i*3+2];
    }

    outArray1.set(null);
    outArray2.set(null);
    outArray3.set(null);
    outArray1.set(arr1);
    outArray2.set(arr2);
    outArray3.set(arr3);
    outArrayLength.set(arr1.length);
}



};

Ops.Array.ArrayUnpack3.prototype = new CABLES.Op();
CABLES.OPS["fa671f66-6957-41e6-ac35-d615b7c29285"]={f:Ops.Array.ArrayUnpack3,objName:"Ops.Array.ArrayUnpack3"};




// **************************************************************
// 
// Ops.Array.ArrayPack3
// 
// **************************************************************

Ops.Array.ArrayPack3 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const exe = op.inTrigger("Trigger in"),
    inArr1=op.inArray("Array 1"),
    inArr2=op.inArray("Array 2"),
    inArr3=op.inArray("Array 3"),
    exeOut = op.outTrigger("Trigger out"),
    outArr=op.outArray("Array out"),
    outNum=op.outValue("Num Points"),
    outArrayLength = op.outNumber("Array length");

var showingError = false;

var arr=[];
var emptyArray=[];
var needsCalc = true;

exe.onTriggered = update;

inArr1.onChange=inArr2.onChange=inArr3.onChange=calcLater;

function calcLater()
{
    needsCalc=true;
}

function update()
{
    var array1=inArr1.get();
    var array2=inArr2.get();
    var array3=inArr3.get();

    if(!array1 && !array2 && !array3 )
    {
        outArr.set(null);
        outNum.set(0);
        return;
    }
    //only update if array has changed
    if(needsCalc)
    {
        var arrlen=0;

        if(!array1 || !array2 || !array3)
        {
            if(array1) arrlen=array1.length;
                else if(array2) arrlen=array2.length;
                else if(array3) arrlen=array3.length;

            if(emptyArray.length!=arrlen)
                for(var i=0;i<arrlen;i++) emptyArray[i]=0;

            if(!array1)array1=emptyArray;
            if(!array2)array2=emptyArray;
            if(!array3)array3=emptyArray;
        }

        if((array1.length !== array2.length) || (array2.length !== array3.length))
        {
            if(!showingError)
            {
                op.uiAttr({error:"Arrays do not have the same length !"});
                outNum.set(0);
                showingError = true;
            }
            return;
        }

        if(showingError)
        {
            showingError = false;
            op.uiAttr({error:null});
        }

        arr.length = array1.length;
        for(var i=0;i<array1.length;i++)
        {
            arr[i*3+0] = array1[i];
            arr[i*3+1] = array2[i];
            arr[i*3+2] = array3[i];
        }

        needsCalc = false;
        outArr.set(null);
        outArr.set(arr);
        outNum.set(arr.length/3);
        outArrayLength.set(arr.length);
    }

    exeOut.trigger();
}



};

Ops.Array.ArrayPack3.prototype = new CABLES.Op();
CABLES.OPS["2bcf32fe-3cbd-48fd-825a-61255bebda9b"]={f:Ops.Array.ArrayPack3,objName:"Ops.Array.ArrayPack3"};




// **************************************************************
// 
// Ops.Trigger.TriggerExtender
// 
// **************************************************************

Ops.Trigger.TriggerExtender = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
// inputs
var inTriggerPort = op.inTriggerButton('Execute');

// outputs
var outTriggerPort = op.outTrigger('Next');

// trigger listener
inTriggerPort.onTriggered = function() {
    outTriggerPort.trigger();
};

};

Ops.Trigger.TriggerExtender.prototype = new CABLES.Op();
CABLES.OPS["7ef594f3-4907-47b0-a2d3-9854eda1679d"]={f:Ops.Trigger.TriggerExtender,objName:"Ops.Trigger.TriggerExtender"};




// **************************************************************
// 
// Ops.Array.ArrayMath
// 
// **************************************************************

Ops.Array.ArrayMath = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const inArray_0 = op.inArray("array 0"),
    NumberIn = op.inValueFloat("Number for math", 0.0),
    mathSelect = op.inSwitch("Math function",['+','-','*','/','%','min','max'],'+'),
    outArray = op.outArray("Array result"),
    outArrayLength = op.outNumber("Array length");

var mathFunc;

var showingError = false;

var mathArray = [];

inArray_0.onChange = NumberIn.onChange =update;
mathSelect.onChange = onFilterChange;

onFilterChange();

function onFilterChange()
{
    var mathSelectValue = mathSelect.get();

    if(mathSelectValue === '+')         mathFunc = function(a,b){return a+b};
    else if(mathSelectValue === '-')    mathFunc = function(a,b){return a-b};
    else if(mathSelectValue === '*')    mathFunc = function(a,b){return a*b};
    else if(mathSelectValue === '/')    mathFunc = function(a,b){return a/b};
    else if(mathSelectValue === '%')    mathFunc = function(a,b){return a%b};
    else if(mathSelectValue === 'min')  mathFunc = function(a,b){return Math.min(a,b)};
    else if(mathSelectValue === 'max')  mathFunc = function(a,b){return Math.max(a,b)};
    update();
    op.setUiAttrib({"extendTitle":mathSelectValue});
}

function update()
{
    var array0 = inArray_0.get();

    mathArray.length = 0;

    if(!array0)
    {
        outArrayLength.set(0);
        outArray.set(null);
        return;
    }

    var num = NumberIn.get();
    mathArray.length = array0.length;

    var i = 0;

    for(i = 0; i < array0.length; i++)
    {
        mathArray[i] = mathFunc(array0[i], num);
    }

    outArray.set(null);
    outArray.set(mathArray);
    outArrayLength.set(mathArray.length);
}



};

Ops.Array.ArrayMath.prototype = new CABLES.Op();
CABLES.OPS["c7617717-3114-452f-9625-e4fefd841e88"]={f:Ops.Array.ArrayMath,objName:"Ops.Array.ArrayMath"};




// **************************************************************
// 
// Ops.Anim.Timer_v2
// 
// **************************************************************

Ops.Anim.Timer_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    inSpeed = op.inValue("Speed", 1),
    playPause = op.inValueBool("Play", true),
    reset = op.inTriggerButton("Reset"),
    inSyncTimeline = op.inValueBool("Sync to timeline", false),
    outTime = op.outValue("Time");

op.setPortGroup("Controls", [playPause, reset, inSpeed]);

const timer = new CABLES.Timer();
let lastTime = null;
let time = 0;
let syncTimeline = false;

playPause.onChange = setState;
setState();

function setState()
{
    if (playPause.get())
    {
        timer.play();
        op.patch.addOnAnimFrame(op);
    }
    else
    {
        timer.pause();
        op.patch.removeOnAnimFrame(op);
    }
}

reset.onTriggered = doReset;

function doReset()
{
    time = 0;
    lastTime = null;
    timer.setTime(0);
    outTime.set(0);
}

inSyncTimeline.onChange = function ()
{
    syncTimeline = inSyncTimeline.get();
    playPause.setUiAttribs({ "greyout": syncTimeline });
    reset.setUiAttribs({ "greyout": syncTimeline });
};

op.onAnimFrame = function (tt)
{
    if (timer.isPlaying())
    {
        if (CABLES.overwriteTime !== undefined)
        {
            outTime.set(CABLES.overwriteTime * inSpeed.get());
        }
        else

        if (syncTimeline)
        {
            outTime.set(tt * inSpeed.get());
        }
        else
        {
            timer.update();
            const timerVal = timer.get();

            if (lastTime === null)
            {
                lastTime = timerVal;
                return;
            }

            const t = Math.abs(timerVal - lastTime);
            lastTime = timerVal;

            time += t * inSpeed.get();
            if (time != time)time = 0;
            outTime.set(time);
        }
    }
};


};

Ops.Anim.Timer_v2.prototype = new CABLES.Op();
CABLES.OPS["aac7f721-208f-411a-adb3-79adae2e471a"]={f:Ops.Anim.Timer_v2,objName:"Ops.Anim.Timer_v2"};


window.addEventListener('load', function(event) {
CABLES.jsLoaded=new Event('CABLES.jsLoaded');
document.dispatchEvent(CABLES.jsLoaded);
});

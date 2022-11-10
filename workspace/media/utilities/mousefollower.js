let MOUSE_FOLLOWER_ENABLED = false;
let mousePosX = 0, mousePosY = 0, mouseCircle = null;
let delay = 6, revisedMousePosX = 0, revisedMousePosY = 0;

function delayMouseFollow() {
    requestAnimationFrame(delayMouseFollow);
    if (!MOUSE_FOLLOWER_ENABLED || !mouseCircle) return
    revisedMousePosX += (mousePosX - revisedMousePosX) / delay;
    revisedMousePosY += (mousePosY - revisedMousePosY) / delay; 
    if (isNaN(revisedMousePosX)) revisedMousePosX=0;
    if (isNaN(revisedMousePosY)) revisedMousePosY=0;
    mouseCircle.style.top = revisedMousePosY + 'px';
    mouseCircle.style.left = revisedMousePosX + 'px';
}

// export function initialize() {
if (!document.getElementById('mouse-follower-circle')) {
    document.body.insertAdjacentHTML('beforeend',`<div id="mouse-follower-circle" style="position: absolute;
    width: 48px;
    height: 48px;
    margin: -24px 0 0 -24px;
    z-index: 2000;
    border: 1px solid rgb(235, 60, 60);
    background-color: rgba(235, 60, 60, 0.4);
    border-radius: 50%;
    pointer-events: none;"></div>`);
}
mouseCircle = document.getElementById('mouse-follower-circle');

document.onmousemove = (e) => {
    mousePosX = e.pageX;
    mousePosY = e.pageY;
}

window.enable_mousefollower = function() {
    MOUSE_FOLLOWER_ENABLED = true;
    document.querySelectorAll('iframe').forEach((iframe) => {iframe.style.pointerEvents = 'none'});
    mouseCircle.style.display = '';
}

window.disable_mousefollower = function() {
    MOUSE_FOLLOWER_ENABLED = false;
    document.querySelectorAll('iframe').forEach((iframe) => {iframe.style.pointerEvents = ''});
    mouseCircle.style.display = 'none';
}

delayMouseFollow();
disable_mousefollower();

// }


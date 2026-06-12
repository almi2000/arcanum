export function createMobileControls({ THREE, camera, enterRoom, interact, updateHover, sound }) {
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
  const move = { x: 0, z: 0 };
  let active = false;
  let yaw = 0;
  let pitch = 0;
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');

  function enable() {
    active = true;
    document.body.classList.add('touch-playing');
    enterRoom();
  }

  function setup() {
    if (!isTouchDevice || document.getElementById('mobile-controls')) return;

    const root = document.createElement('div');
    root.id = 'mobile-controls';
    root.innerHTML = '<div id="touch-look-zone"></div><div id="touch-stick"><div id="touch-stick-knob"></div></div>';
    document.body.appendChild(root);

    const stick = root.querySelector('#touch-stick');
    const knob = root.querySelector('#touch-stick-knob');
    const lookZone = root.querySelector('#touch-look-zone');
    let stickId = null;
    let lookId = null;
    let lastLookX = 0;
    let lastLookY = 0;
    let tapStartX = 0;
    let tapStartY = 0;
    let tapStartTime = 0;
    let didDragLook = false;

    function setStick(clientX, clientY) {
      const rect = stick.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const max = rect.width * 0.34;
      const len = Math.hypot(dx, dy);
      const scale = len > max ? max / len : 1;
      const x = dx * scale;
      const y = dy * scale;
      knob.style.transform = `translate(${x}px, ${y}px)`;
      move.x = THREE.MathUtils.clamp(x / max, -1, 1);
      move.z = THREE.MathUtils.clamp(-y / max, -1, 1);
    }

    function resetStick() {
      stickId = null;
      move.x = 0;
      move.z = 0;
      knob.style.transform = 'translate(0, 0)';
    }

    stick.addEventListener('touchstart', (event) => {
      event.preventDefault();
      sound.unlock();
      enable();
      const touch = event.changedTouches[0];
      stickId = touch.identifier;
      setStick(touch.clientX, touch.clientY);
    }, { passive: false });

    stick.addEventListener('touchmove', (event) => {
      event.preventDefault();
      for (const touch of event.changedTouches) if (touch.identifier === stickId) setStick(touch.clientX, touch.clientY);
    }, { passive: false });

    stick.addEventListener('touchend', (event) => {
      for (const touch of event.changedTouches) if (touch.identifier === stickId) resetStick();
    });
    stick.addEventListener('touchcancel', resetStick);

    lookZone.addEventListener('touchstart', (event) => {
      event.preventDefault();
      sound.unlock();
      enable();
      const touch = event.changedTouches[0];
      lookId = touch.identifier;
      lastLookX = touch.clientX;
      lastLookY = touch.clientY;
      tapStartX = touch.clientX;
      tapStartY = touch.clientY;
      tapStartTime = performance.now();
      didDragLook = false;
    }, { passive: false });

    lookZone.addEventListener('touchmove', (event) => {
      event.preventDefault();
      for (const touch of event.changedTouches) {
        if (touch.identifier !== lookId) continue;
        const dx = touch.clientX - lastLookX;
        const dy = touch.clientY - lastLookY;
        lastLookX = touch.clientX;
        lastLookY = touch.clientY;
        if (Math.hypot(touch.clientX - tapStartX, touch.clientY - tapStartY) > 12) didDragLook = true;
        yaw -= dx * 0.0032;
        pitch -= dy * 0.0032;
        pitch = THREE.MathUtils.clamp(pitch, -Math.PI / 2 + 0.08, Math.PI / 2 - 0.08);
        euler.set(pitch, yaw, 0);
        camera.quaternion.setFromEuler(euler);
      }
    }, { passive: false });

    lookZone.addEventListener('touchend', (event) => {
      for (const touch of event.changedTouches) {
        if (touch.identifier !== lookId) continue;
        const wasTap = !didDragLook && performance.now() - tapStartTime < 360;
        lookId = null;
        if (wasTap) {
          updateHover();
          interact();
        }
      }
    });
    lookZone.addEventListener('touchcancel', () => { lookId = null; });
  }

  setup();

  return {
    isTouchDevice,
    move,
    enable,
    isActive: () => active,
  };
}
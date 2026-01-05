const c=['input[type="email"]','input[type="text"][name*="user"]','input[type="text"][name*="login"]','input[type="text"][name*="email"]','input[type="text"][id*="user"]','input[type="text"][id*="login"]','input[type="text"][id*="email"]','input[autocomplete="username"]','input[autocomplete="email"]'],h=['input[type="password"]','input[autocomplete="current-password"]','input[autocomplete="new-password"]'];let l=[],v=[];function u(){p(),w(),g()}function p(){const i=[],n=window.location.hostname;return document.querySelectorAll(h.join(", ")).forEach(e=>{var o,a;const s=e.closest("form");let r=null;if(s){for(const d of c)if(r=s.querySelector(d),r)break}if(!r){const d=(a=(o=e.parentElement)==null?void 0:o.parentElement)==null?void 0:a.parentElement;if(d){for(const y of c)if(r=d.querySelector(y),r)break}}i.push({usernameField:r,passwordField:e,domain:n}),m(e),r&&m(r)}),l=i,i}function m(i){if(i.dataset.passcommitIndicator)return;i.dataset.passcommitIndicator="true";const n=document.createElement("div");n.className="passcommit-indicator",n.innerHTML=`
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2"/>
      <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;const t=()=>{const e=i.getBoundingClientRect();n.style.position="fixed",n.style.top=`${e.top+e.height/2-10}px`,n.style.left=`${e.right-28}px`,n.style.zIndex="2147483647"};t(),window.addEventListener("scroll",t),window.addEventListener("resize",t),n.addEventListener("click",async e=>{var r;e.preventDefault(),e.stopPropagation();const s=await chrome.runtime.sendMessage({type:"GET_CREDENTIALS_FOR_DOMAIN",payload:{domain:window.location.hostname}});((r=s==null?void 0:s.data)==null?void 0:r.length)>0?b(i,s.data):chrome.runtime.sendMessage({type:"OPEN_POPUP"})}),document.body.appendChild(n),v.push(n)}function b(i,n){const t=document.querySelector(".passcommit-picker");t&&t.remove();const e=document.createElement("div");e.className="passcommit-picker";const s=i.getBoundingClientRect();e.style.cssText=`
    position: fixed;
    top: ${s.bottom+4}px;
    left: ${s.left}px;
    min-width: ${s.width}px;
    max-width: 300px;
    z-index: 2147483647;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `,e.innerHTML=`
    <div style="padding: 8px 12px; border-bottom: 1px solid #334155; font-size: 11px; color: #94a3b8; font-weight: 600;">
      PASSCOMMIT
    </div>
    ${n.map(o=>`
      <button class="passcommit-cred-item" data-id="${o.id}" style="
        width: 100%;
        padding: 10px 12px;
        border: none;
        background: transparent;
        cursor: pointer;
        text-align: left;
        color: #f1f5f9;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        <div style="width: 24px; height: 24px; background: #334155; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2">
            <circle cx="12" cy="7" r="4"/>
            <path d="M5 21v-2a7 7 0 0 1 14 0v2"/>
          </svg>
        </div>
        <div>
          <div style="font-weight: 500;">${o.username}</div>
          <div style="font-size: 11px; color: #64748b;">${o.domain}</div>
        </div>
      </button>
    `).join("")}
  `,e.querySelectorAll(".passcommit-cred-item").forEach(o=>{o.addEventListener("click",async()=>{const a=o.dataset.id;await chrome.runtime.sendMessage({type:"AUTOFILL",payload:{credentialId:a}}),e.remove()}),o.addEventListener("mouseenter",()=>{o.style.background="#334155"}),o.addEventListener("mouseleave",()=>{o.style.background="transparent"})});const r=o=>{e.contains(o.target)||(e.remove(),document.removeEventListener("click",r))};setTimeout(()=>document.addEventListener("click",r),100),document.body.appendChild(e)}function g(){chrome.runtime.onMessage.addListener((i,n,t)=>{if(i.type==="DO_AUTOFILL"){const{username:e,password:s}=i.payload;x(e,s),t({success:!0})}return!0})}function x(i,n){l.length===0&&p();for(const t of l)t.usernameField&&(t.usernameField.value=i,t.usernameField.dispatchEvent(new Event("input",{bubbles:!0})),t.usernameField.dispatchEvent(new Event("change",{bubbles:!0}))),t.passwordField&&(t.passwordField.value=n,t.passwordField.dispatchEvent(new Event("input",{bubbles:!0})),t.passwordField.dispatchEvent(new Event("change",{bubbles:!0})))}function w(){new MutationObserver(n=>{var e,s;let t=!1;for(const r of n){if(r.addedNodes.length>0){for(const o of r.addedNodes)if(o instanceof HTMLElement&&((e=o.matches)!=null&&e.call(o,'input[type="password"]')||(s=o.querySelector)!=null&&s.call(o,'input[type="password"]'))){t=!0;break}}if(t)break}t&&setTimeout(p,100)}).observe(document.body,{childList:!0,subtree:!0})}function f(){document.addEventListener("submit",async i=>{const n=i.target,t=n.querySelector('input[type="password"]');if(!t||!t.value)return;let e=null;for(const r of c)if(e=n.querySelector(r),e!=null&&e.value)break;if(!(e!=null&&e.value))return;await E(e.value)&&chrome.runtime.sendMessage({type:"SAVE_CREDENTIAL",payload:{domain:window.location.hostname,username:e.value,encryptedPassword:t.value}})})}async function E(i){return new Promise(n=>{var e,s;const t=document.createElement("div");t.className="passcommit-save-prompt",t.style.cssText=`
      position: fixed;
      top: 20px;
      right: 20px;
      width: 320px;
      z-index: 2147483647;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      border: 1px solid #334155;
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
      animation: slideIn 0.3s ease-out;
    `,t.innerHTML=`
      <style>
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      </style>
      <div style="padding: 16px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #0ea5e9, #6366f1); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z"/>
              <path d="M8 12L10.5 14.5L16 9"/>
            </svg>
          </div>
          <div>
            <div style="font-size: 14px; font-weight: 600; color: #f1f5f9;">Save password?</div>
            <div style="font-size: 12px; color: #94a3b8;">${i}</div>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="passcommit-save-btn" style="
            flex: 1;
            padding: 10px;
            background: linear-gradient(135deg, #0ea5e9, #0284c7);
            border: none;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            cursor: pointer;
            font-size: 13px;
          ">Save</button>
          <button id="passcommit-never-btn" style="
            flex: 1;
            padding: 10px;
            background: #334155;
            border: none;
            border-radius: 8px;
            color: #94a3b8;
            font-weight: 500;
            cursor: pointer;
            font-size: 13px;
          ">Never</button>
        </div>
      </div>
    `,document.body.appendChild(t),(e=t.querySelector("#passcommit-save-btn"))==null||e.addEventListener("click",()=>{t.remove(),n(!0)}),(s=t.querySelector("#passcommit-never-btn"))==null||s.addEventListener("click",()=>{t.remove(),n(!1)}),setTimeout(()=>{document.body.contains(t)&&(t.remove(),n(!1))},1e4)})}window.addEventListener("unload",()=>{v.forEach(i=>i.remove())});document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>{u(),f()}):(u(),f());

export function showContextMenu(actions, event, { id = 'productContextMenu' } = {}) {
    event && event.preventDefault && event.preventDefault();
    event && event.stopPropagation && event.stopPropagation();

    const existing = document.getElementById(id);
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.id = id;
    menu.className = 'sol-context-menu';

    const list = document.createElement('ul');
    menu.appendChild(list);

    actions.forEach(item => {
        if (item.separator) {
            const sep = document.createElement('li');
            sep.className = 'separator';
            list.appendChild(sep);
            return;
        }
        const li = document.createElement('li');
        li.textContent = item.label;
        if (item.class) li.classList.add(item.class);
        li.onclick = () => {
            item.handler();
            hideMenu();
        };
        list.appendChild(li);
    });

    menu.style.position = 'absolute';
    menu.style.top = `${event.clientY}px`;
    menu.style.left = `${event.clientX}px`;
    menu.style.zIndex = 1000;

    document.body.appendChild(menu);

    function hideMenu() {
        menu.remove();
        document.removeEventListener('click', hideMenu);
    }
    setTimeout(() => document.addEventListener('click', hideMenu));
}

export default showContextMenu;
(function() {
	function watch(obj, path, callback, initVal) {
		if (!obj || typeof obj != "object") {
			initVal !== undefined && callback && callback();
			return;
		}
		var prop = path.shift(),
			unwatch;
		
		if (path.length > 0) {
			unwatch = watch(obj[prop], path.slice(), callback, initVal);
		} else if (obj[prop] !== initVal) {
			callback(obj[prop]);
		}
		
		function observer(changes) {
			changes.forEach(function(change) {
				if (change.name == prop) {
					if (path.length === 0) {
						callback(change.object[change.name]);
					} else {
						var oldVal = unwatch ? unwatch() : undefined;
						unwatch = watch(obj[prop], path.slice(), callback, oldVal);
					}
				}
			});
		}
		Object.observe(obj, observer);
		
		return function() {
			Object.unobserve(obj, observer);
			return unwatch ? unwatch() : obj[prop];
		}
	};
	
	function get(obj, path) {
		var path = path.split('.'),
		    prop = path.pop();
			
		for (var i = 0, n = path.length; obj && i < n; i++) {
			obj = obj[path[i]];
		}

		return obj && obj[prop];
	}
	
	function set(obj, path, value) {
		var path = path.split('.'),
		    prop = path.pop();
			
		for (var i = 0, n = path.length; obj && i < n; i++) {
			obj = obj[path[i]];
		}

		obj && (obj[prop] = value);
	}
	
	function initNode(node) {
		var bindings = {},
			active = false,
			changeEvents = 0;

		var observer = new MutationObserver(function observer(changes) {
			for (var i = 0, n = changes.length; i < n; i++) {
				var attr = changes[i].attributeName;
				if (bindings[attr]) {
					var newValue = changes[i].target.getAttribute(attr);
					set(bindings[attr].obj, bindings[attr].path, newValue);
				}
			};
		});
		
		function onchange(event) {
			if (bindings["value"]) {
				set(bindings["value"].obj, bindings["value"].path, this.value);
			}
		}
		
		Object.defineProperties(node, {
			bind: {
				value: function bind(attr, obj, path) {
					var update;
					node.unbind(attr);
					
					if (attr == "value" && (node instanceof HTMLInputElement || node instanceof HTMLTextareaElement)) {
						this.value = get(obj, path);
						if (++changeEvents === 1) {
							node.addEventListener("change", onchange);
						}
						updateNode = function(value) {
							node.value = value;
						}
					}
					/*
					else if (attr == "checked" && node instanceof HTMLInputElement) {
						this.checked = !!get(obj, path);
						if (++changeEvents === 1) {
							node.addEventListener("change", onchange);
						}
						updateNode = function(value) {
							node.checked = !!value;
						}
					}
					else if (attr == "selectedIndex" && node instanceof HTMLSelectElement) {
						this.checked = !!get(obj, path);
						if (++changeEvents === 1) {
							node.addEventListener("change", onchange);
						}
						updateNode = function(value) {
							node.checked = !!value;
						}
					}
					*/
					else {
						updateNode = function(value) {
							node.setAttribute(attr, value);
						}
					}
					
					bindings[attr] = {
						obj: obj,
						path: path,
						disconnect: watch(obj, path.split('.'), updateNode)
					}
					
					active || observer.observe(node, { attributes: true, childList: true });
				}
			},
			unbind: {
				value: function unbind(attr) {
					if (attr) {
						if (bindings[attr]) {
							bindings[attr].disconnect();
							delete bindings[attr];
							
							if (attr == "value" && --changeEvents == 0) {
								node.removeEventListener("change", onchange);
							}
							
							if (unbind.caller !== node.bind && bindings.getOwnPropertyNames().length == 0) {
								observer.disconnect();
							}
						}
					} else {
						bindings.getOwnPropertyNames().forEach(function (attr) {
							node.unbind(attr);
						});
					}
				}
			}
		});
	}
	
	Object.defineProperties(Node.prototype, {
		bind: {
			value: function bind(attr, obj, path) {
				initNode(this);
				this.bind(attr, obj, path);
			}
		},
		unbind: {
			value: function unbind(attr) {
				initNode(this);
				this.unbind(attr);
			}
		}
	});
})();

function simpleCapitalize(str, forceLowerCase = false) {
	if (forceLowerCase)
		return str[0].toUpperCase() + str.substring(1).toLowerCase();
	return str[0].toUpperCase() + str.substring(1);
}

let items = [];
for (let line of data.split("\n")) {
	let [category, name, customization, tags, filename, stack, id, advancedFilter, patternRule] = line.split("\t").map(x => x.trim());
	let item = {
		category: category,
		name: name.startsWith("π") ? name : simpleCapitalize(name),
		customization: customization.length ? customization.split(";").map(simpleCapitalize) : [],
		//nameForSearch: prepareTextForSearch(name) + (customization.length ? (" " + customization.split(";").map(x => "(" + prepareTextForSearch(x) + ")").join(" ")) : ""),
		nameForSearch: prepareTextForSearch(name + customization),
		tags: tags.length ? tags.split(";") : [],
		filename: filename,
		stack: stack,
		id: id.substring(2),
		requiredAdvancedFilter: advancedFilter,
		patternRule: patternRule,
		idReversed: id.substring(2).padStart(16, "0").substring(8) + id.substring(2).padStart(16, "0").substring(0, 8)
	};
	if (item.patternRule.startsWith("D:")) item.patternRule = ""; //hack to ignore D: patterns, because they aren't worth commenting on
	let patternRuleContexts = item.patternRule.substring(0, item.patternRule.indexOf(":"));
	if (patternRuleContexts.includes("C")) item.tags.push("canusecustompatterns");
	if (patternRuleContexts.includes("S")) item.tags.push("canusesablepatterns");
	item.tags = item.tags.sort();
	items.push(item);
}
function prepareTextForSearch(txt) {
	return txt.trim().toLowerCase().replace(/[ %&'(),-.?←↑→;!]/g, "").replace(/[éè]/g, "e").replace(/[àáâ]/g, "a").replace(/[ñ]/g, "n").replace(/[π]/g, "pi");
}
items = items.sort((a,b) => a.name > b.name ? 1 : -1);
items = items.sort((a,b) => a.idReversed > b.idReversed ? 1 : -1);
for (let i = 0; i < items.length; i++) items[i].order = i;
let itemsById = {}; //points to stuff in items, using their id
for (let item of items) {
	itemsById[item.id] = item;
}

for (let item of items) {
	let img = item.img = document.createElement("img");
	img.setAttribute("loading", "lazy");
	img.src = item.filename;
	img.setAttribute("title", item.name + (item.customization.length ? (" " + item.customization.map(c => "(" + c + ")").join(" ")) : ""));
	img.onclick = function() {
		addWishlistEntry(item);
	}
	if (item.requiredAdvancedFilter != "") {
		img.setAttribute("advancedfilter", item.requiredAdvancedFilter);
	}
	img.onmouseenter = function() {
		investigateItem(item);
	}
	img.onmouseleave = function() {
		if (currentlyInvestigatedItem == item) investigateItem(null);
	}
}

function categoryDisplayName(internalName) {
	if (internalName == "flower") internalName = "Flowers";
	if (internalName == "tree") internalName = "Trees";
	if (internalName == "bush") internalName = "Bushes";
	if (internalName == "vegetable") internalName = "Vegetables";
	if (internalName == "tools_goods") internalName = "tools";
	if (internalName == "clothing other") internalName = "wet suits";
	return simpleCapitalize(internalName);
}
let categories = {};
for (let item of items) {
	if (!categories[item.category]) categories[item.category] = 0;
	categories[item.category]++;
}
let categoriesGroups = [
	[
		["Furniture", ["housewares", "miscellaneous", "wall-mounted", "ceiling decor"]],
		["Walls and floors", ["wallpaper", "rugs", "floors", "interior structures"]]
	],
	[
		["Collectibles", ["photos", "posters", "gyroids", "music"]],
		["Museum", ["insects", "fish", "fossils", "artwork", "sea creatures"]]
	],
	[
		["Plants", ["flower", "vegetable", "tree", "bush"]],
		["Items", ["tools_goods", "fencing", "other", "crafting materials", "shells", "fragments", "wrapping"]]
	],
	[
		["Clothes", ["tops", "dress-up", "headwear", "bottoms", "shoes", "socks", "accessories", "bags", "umbrellas", "clothing other"]]
	]
];

function makeCategoriesDropdown(parentItem) {
	let categoriesDropdown = preparePositionalModal(parentItem);
	if (categoriesDropdown == undefined) return;
	categoriesDropdown.setAttribute("id", "categories-dropdown");
	let categoriesDropdownTable = categoriesDropdown.appendChild(document.createElement("table"));
	let categoriesDropdownTr = categoriesDropdownTable.appendChild(document.createElement("tr"));
	for (let column of categoriesGroups) {
		let categoriesDropdownTd = categoriesDropdownTr.appendChild(document.createElement("td"));
		for (let i = 0; i < column.length; i++) {
			let [categoryGroupName, categoriesList] = column[i];
			let container = categoriesDropdownTd.appendChild(document.createElement("div"));
			let header = container.appendChild(document.createElement("label"));
			let headerInput = header.appendChild(document.createElement("input"));
			headerInput.setAttribute("type", "checkbox");
			headerInput.checked = categoriesList.filter(category => acceptableCategories[category]).length ? true : false;
			headerInput.onchange = function() {
				for (let input of container.querySelectorAll("input[type=\"checkbox\"]")) input.checked = this.checked;
				for (let category of categoriesList) acceptableCategories[category] = this.checked;
				updateCategoryDisplay();
				presentResults();
			}
			header.appendChild(document.createTextNode(categoryGroupName))
			header.style.fontSize = "1.125rem";
			header.style.paddingBottom = "0.5rem";
			header.style.marginBottom = "0.5rem";
			header.style.borderBottom = "solid 2px var(--white)";
			if (i) header.style.paddingTop = "1.5rem";
			for (let category of categoriesList.sort((a, b) => categories[b] - categories[a])) {
				let label = container.appendChild(document.createElement("label"));
				let input = label.appendChild(document.createElement("input"));
				input.setAttribute("type", "checkbox");
				input.checked = acceptableCategories[category];
				label.appendChild(document.createTextNode(categoryDisplayName(category)));
				input.onchange = function() {
					acceptableCategories[category] = this.checked;
					headerInput.checked = categoriesList.filter(category => acceptableCategories[category]).length ? true : false;
					updateCategoryDisplay();
					presentResults();
				}
			}
		}
	}
	let allButton = categoriesDropdown.appendChild(document.createElement("button"));
	allButton.setAttribute("class", "subtle-button");
	allButton.innerText = "Enable all categories";
	allButton.onclick = function() {
		for (let category in categories) acceptableCategories[category] = true;
		for (let input of document.querySelectorAll(".modal input[type=\"checkbox\"]")) input.checked = true;
		updateCategoryDisplay();
		presentResults();
	}
	let noneButton = categoriesDropdown.appendChild(document.createElement("button"));
	noneButton.setAttribute("class", "subtle-button");
	noneButton.style.setProperty("--accent", "var(--red)");
	noneButton.innerText = "Disable all categories";
	noneButton.style.marginLeft = "1rem";
	noneButton.onclick = function() {
		for (let category in categories) acceptableCategories[category] = false;
		for (let input of document.querySelectorAll(".modal input[type=\"checkbox\"]")) input.checked = false;
		updateCategoryDisplay();
		presentResults();
	}
}
function updateCategoryDisplay() {
	let labelsPresent = [];
	for (let c of categoriesGroups) for (let [supercategoryName, categories] of c) {
		let allPresent = true;
		for (let c of categories) if (!acceptableCategories[c]) allPresent = false;
		if (allPresent) labelsPresent.push(supercategoryName);
		else for (let c of categories) if (acceptableCategories[c]) labelsPresent.push(categoryDisplayName(c));
	}
	let text;
	if (labelsPresent.length == 0) text = "<span style=\"color: var(--black); background: var(--red); border-radius: 100%; display: inline-block; width: 1.125rem; text-align: center;\">!</span> Nothing";
	else if (labelsPresent.length == 1) text = labelsPresent[0];
	else if (labelsPresent.length == 2) text = simpleCapitalize(labelsPresent.join(" and "), true);
	else if (!Object.keys(categories).filter(x => !acceptableCategories[x]).length) text = "Everything";
	else text = Object.keys(categories).filter(x => acceptableCategories[x]).length + " categories";
	document.querySelector("#search-parameters-category").innerHTML = text;
}


let tags = {};
for (let item of items) for (let tag of item.tags) {
	if (!tags[tag]) tags[tag] = 0;
	tags[tag]++;
}
//for (let tag in tags) if (tags[tag] <= 1) delete tags[tag];
//for (let item of items) item.tags = item.tags.filter(x => tags[x]);


function prepareModal() {
	if (document.querySelector(".modal")) return undefined;
	let cover = document.body.appendChild(document.createElement("div"));
	cover.setAttribute("class", "modal-cover");
	let modal = document.body.appendChild(document.createElement("div"));
	modal.setAttribute("class", "modal");
	let closeButton = modal.appendChild(document.createElement("button"));
	closeButton.setAttribute("class", "close-modal-button");
	closeButton.innerText = "×";
	cover.onclick = closeButton.onclick = function() {
		modal.style.animation = "0.1s exit-transformed forwards";
		cover.style.animation = "0.1s fadeout forwards";
		setTimeout(function() {
			cover.remove();
			modal.remove();
		}, 100);
	}
	modal.onclick = function(e) {
		e.stopPropagation();
	}
	return modal;
}

function preparePositionalModal(parentItem) {
	if (document.querySelector(".modal")) return undefined;
	parentItem.style.position = "relative";
	let cover = document.body.appendChild(document.createElement("div"));
	cover.setAttribute("class", "modal-cover modal-cover-positional");
	let modal = parentItem.appendChild(document.createElement("div"));
	modal.setAttribute("class", "modal modal-positional");
	cover.onclick = function() {
		modal.style.animation = "0.1s exit-untransformed forwards";
		cover.style.animation = "0.1s fadeout forwards";
		setTimeout(function() {
			cover.remove();
			modal.remove();
		}, 100);
	}
	modal.onclick = function(e) {
		e.stopPropagation();
	}
	return modal;
}

function addTag(tag, supressPresentResults = false) {
	if (selectedTags[tag] || !tags[tag]) return;
	selectedTags[tag] = true;
	let tagPlate = document.createElement("span");
	tagPlate.setAttribute("class", "tag-plate xable");
	tagPlate.innerText = tagDisplayName[tag];
	tagPlate.onclick = function() {
		removeTag(this, tag);
	}
	document.querySelector("#search-parameters-tags").appendChild(tagPlate);
	if (!supressPresentResults) presentResults();
	document.querySelector("#search-parameters-add-tag").style.marginLeft = "0.25rem";
}

function promptAddTag(parentItem) {
	let modal = preparePositionalModal(parentItem);
	if (modal == undefined) return;
	modal.style.width = "32rem";
	let input = modal.appendChild(document.createElement("input"));
	input.select();
	input.style.marginTop = "0.75rem";
	let availableTags = modal.appendChild(document.createElement("div"));
	availableTags.setAttribute("id", "available-tags");
	let divs = [];
	for (let tag of Object.keys(tagDisplayName).sort((a, b) => tags[b] - tags[a])) {
		let tagName = tagDisplayName[tag];
		let div = document.createElement("div");
		div.innerText = tagName;
		div.setAttribute("class", "tag-plate choosable");
		div.onclick = function() {
			addTag(tag);
			showAvailableTags(true);
		}
		divs.push({
			tag: tag,
			text: prepareTextForSearch(tagName),
			div: div
		});
	}
	input.oninput = function() {
		showAvailableTags();
	}
	showAvailableTags();
	function showAvailableTags(allowCloseIfNothing = false) {
		let searchText = prepareTextForSearch(input.value);
		for (let div of divs) div.available = div.text.includes(searchText) && !selectedTags[div.tag];
		let totalAvailable = divs.filter(x => x.available).length;
		if (totalAvailable == 0 && allowCloseIfNothing) return document.querySelector(".modal-cover").onclick();
		while (availableTags.firstChild) availableTags.firstChild.remove();
		let shown = 0;
		for (let div of divs) if (div.available) {
			availableTags.appendChild(div.div);
			shown++;
			if (shown >= 50) break;
		}
		let extraCommentText = undefined;
		if (shown < totalAvailable) extraCommentText = shown + " out of " + totalAvailable + " tag" + (totalAvailable==1?"":"s") + " shown";
		if (totalAvailable == 0) extraCommentText = "No tags";
		if (extraCommentText) {
			let extraComment = availableTags.appendChild(document.createElement("div"));
			extraComment.innerText = extraCommentText
			extraComment.style.marginTop = "0.5rem";
			extraComment.style.fontSize = "0.875rem";
			extraComment.style.color = "var(--gray)";
		}
	}
}

function promptAdvancedFilters() {
	let modal = prepareModal();
	if (!modal) return;
	modal.style.width = "32rem";
	modal.appendChild(document.createElement("p")).innerHTML = "Enabling advanced filters will add extra items to the catalog which usually aren't visible. They can be easily confused with other items, which is why I put them behind here. <span style=\"color: var(--blue);\">None of these items are dangerous to pick up.</span>";
	modal.appendChild(document.createElement("p")).innerHTML = "These items will <span style=\"color: var(--accent); animation: 1s flash-accent infinite;\">flash blue and white</span> to let you know their deal.";
	for (let [setting, image, headtext, bodytext] of [
		["growthstages", "https://acnhcdn.com/latest/MenuIcon/PltBushPlumeriaWhite.png", "List growth stages separately?", "Plants with several growth stages (trees, bushes, flowers, vegetables) have separate internal IDs for each growth stage. Enable this to show each of these stages separately."],
		["fakeart", "https://acnhcdn.com/latest/FtrIcon/FtrSculptureRosettaStoneFake.png", "Show fake art?", "Around half of Redd's artwork is fake. These counterfeits are hidden by default. Enable this to show fake artwork."],
		//["weird", "https://acnhcdn.com/latest/FtrIcon/LostQuestBagDust.png", "", "Strange items"],
	]) {
		modal.appendChild(document.createElement("hr"));
		let header = modal.appendChild(document.createElement("div"));
		let img = header.appendChild(document.createElement("img"));
		img.src = image;
		img.style.width = img.style.height = "2rem";
		img.style.marginRight = "0.5rem";
		img.style.verticalAlign = "middle";
		setImageFlashingState();
		function setImageFlashingState() {
			if (advancedFilters[setting]) img.setAttribute("advancedfilter", setting);
			else img.removeAttribute("advancedfilter", setting);
		}
		header.appendChild(document.createTextNode(headtext));
		let checkbox = header.appendChild(document.createElement("input"));
		checkbox.style.marginLeft = "1rem";
		checkbox.setAttribute("type", "checkbox");
		checkbox.checked = advancedFilters[setting];
		checkbox.onchange = function() {
			advancedFilters[setting] = !advancedFilters[setting];
			setImageFlashingState();
			presentResults();
		}
		let p = modal.appendChild(document.createElement("p"));
		p.style.marginTop = "0.5rem";
		p.innerText = bodytext;
	}
}

function wishlistsPage() {
	let modal = prepareModal();
	if (!modal) return;
	modal.style.width = "32rem";
	modal.style.minHeight = "24rem";
	modal.appendChild(document.createElement("p")).innerText = "Here is a list of your saved wishlists.";
	let table = modal.appendChild(document.createElement("table"));
	table.setAttribute("class", "wishlists-list");
	for (let wishlistName of Object.keys(wishlists).sort()) {
		let tr = table.appendChild(document.createElement("tr"));
		tr.appendChild(document.createElement("td")).innerText = wishlistName;
		let count = Object.keys(wishlists[wishlistName]).map(x => wishlists[wishlistName][x]).reduce((a, b) => a + b, 0);
		let countElement = tr.appendChild(document.createElement("td"));
		countElement.innerText = (count==0 ? "No items" : (count==1 ? "1 item" : count + " items"));
		let deleteButton = tr.appendChild(document.createElement("td")).appendChild(document.createElement("button"));
		deleteButton.setAttribute("class", "subtle-button");
		deleteButton.innerText = "Remove";
		deleteButton.onclick = function(e) {
			let lastOne = Object.keys(wishlists).length == 1;
			removeWishlist(wishlistName);
			e.stopPropagation();
			tr.remove();
			if (lastOne) document.querySelector(".modal-cover").onclick();
			//document.querySelector(".modal-cover").onclick();
		};
		tr.onclick = function() {
			goToWishlist(wishlistName);
			document.querySelector(".modal-cover").onclick();
		};
	}
	let addButton = modal.appendChild(document.createElement("button"));
	addButton.innerText = "Create new list";
	addButton.onclick = function() {
		startNewWishlist();
		document.querySelector(".modal-cover").onclick();
	};
}

function removeTag(div, tag) {
	if (!selectedTags[tag] || !tags[tag]) return;
	div.remove();
	delete selectedTags[tag];
	if (!Object.keys(selectedTags).length) document.querySelector("#search-parameters-add-tag").style.marginLeft = "0";
	presentResults();
}

let currentDataFormatNumber = 1;
let savedata = JSON.parse(localStorage.getItem("acnhitemwishlist")) || {};
/*
savedata has fields, which mostly correspond to global variables
- wishlists
- selectedTags
- acceptableCategories
- currentSearchBoxText (NOT a global variable)
- advancedFilters
- currentlySelectedWishlist
- dataFormatNumber
*/
let wishlists;
let selectedTags = {};
let acceptableCategories;
let advancedFilters;
let currentlySelectedWishlist;
if (savedata.dataFormatNumber == undefined || savedata.dataFormatNumber < currentDataFormatNumber) {
	console.log("SETUP TOTALLY NEW SAVE DATA");
	//Setup totally new save data
	wishlists = {"My wishlist":{}};
	acceptableCategories = {};
	for (let category in categories) acceptableCategories[category] = true;
	document.querySelector("#search-parameters-name").value = "";
	advancedFilters = {"":true};
	currentlySelectedWishlist = "My wishlist";
} else {
	wishlists = savedata.wishlists;
	acceptableCategories = savedata.acceptableCategories;
	document.querySelector("#search-parameters-name").value = savedata.currentSearchBoxText;
	advancedFilters = savedata.advancedFilters;
	currentlySelectedWishlist = savedata.currentlySelectedWishlist;
	for (let tag in savedata.selectedTags) addTag(tag, true); //true to supress several presentResults calls
}
function saveState() {
	savedata = {
		wishlists: wishlists,
		selectedTags: selectedTags,
		acceptableCategories: acceptableCategories,
		currentSearchBoxText: document.querySelector("#search-parameters-name").value,
		advancedFilters: advancedFilters,
		currentlySelectedWishlist: currentlySelectedWishlist,
		dataFormatNumber: currentDataFormatNumber
	};
	localStorage.setItem("acnhitemwishlist", JSON.stringify(savedata));
}

goToWishlist(currentlySelectedWishlist);

function startNewWishlist(selectTextBox = true) {
	let name = "My wishlist";
	for (let i = 2; wishlists[name]; i++) name = "My wishlist " + i;
	wishlists[name] = {};
	goToWishlist(name);
	if (selectTextBox) document.querySelector("#wishlist-name").select();
	saveState();
}

function changeCurrentWishlistName(newName) {
	newName = newName.trim();
	if (wishlists[newName]) {
		document.querySelector("#wishlist-name").value = currentlySelectedWishlist;
		return;
	}
	wishlists[newName] = wishlists[currentlySelectedWishlist];
	delete wishlists[currentlySelectedWishlist];
	currentlySelectedWishlist = newName;
	saveState();
}

function goToWishlist(wishlistName) {
	if (!wishlists[wishlistName]) return;
	currentlySelectedWishlist = wishlistName;
	document.querySelector("#wishlist-name").value = wishlistName;
	let entries = document.querySelector("#wishlist-entries");
	while (entries.firstChild) entries.firstChild.remove();
	for (let item of items) item.img.setAttribute("wishlisted", "false");
	for (let id of Object.keys(wishlists[wishlistName]).sort((a,b) => itemsById[a].order - itemsById[b].order)) {
		addWishlistEntry(itemsById[id], wishlists[wishlistName][id], true);
	}
	updateWishlistBottomMessage();
}

function removeWishlist(wishlistName) {
	if (!wishlists[wishlistName]) return;
	delete wishlists[wishlistName];
	saveState();
	if (currentlySelectedWishlist == wishlistName) {
		let available = Object.keys(wishlists).sort();
		if (available.length) goToWishlist(available[0]);
		else startNewWishlist();
	}
}

function addWishlistEntry(item, qty = 1, bypassCheck = false) {
	if (!bypassCheck && wishlists[currentlySelectedWishlist][item.id]) return;
	
	
	let div = document.createElement("div");
	
	let existingEntries = Array.from(document.querySelectorAll(".wishlist-entry"));
	let everInserted = false;
	for (let entry of existingEntries) if (itemsById[entry.getAttribute("item-id")].order > item.order) {
		document.querySelector("#wishlist-entries").insertBefore(div, entry);
		everInserted = true;
		break;
	}
	if (!everInserted) document.querySelector("#wishlist-entries").appendChild(div);
	
	div.setAttribute("class", "wishlist-entry");
	let img = div.appendChild(document.createElement("img"));
	img.src = item.filename;
	div.onmouseenter = function() {
		investigateItem(item);
	}
	div.onmouseleave = function() {
		if (currentlyInvestigatedItem == item) investigateItem(null);
	}
	if (item.requiredAdvancedFilter != "") img.setAttribute("advancedfilter", item.requiredAdvancedFilter);
	let nameTile = div.appendChild(document.createElement("span"));
	nameTile.innerText = item.name;
	nameTile.setAttribute("class", "wishlist-entry-name");
	for (let c of item.customization) {
		nameTile.appendChild(document.createElement("b")).innerText = "(" + c + ")";
	}
	if (item.stack != 1) {
		nameTile.appendChild(document.createElement("b")).innerText = "x" + item.stack + "";
	}
	let quantity = div.appendChild(document.createElement("input"));
	quantity.value = wishlists[currentlySelectedWishlist][item.id] = qty;
	wishlists[currentlySelectedWishlist][item.id] = qty;
	quantity.setAttribute("class", "quantity-input");
	quantity.onchange = function() {
		if (this.value == "") return;
		let number = parseInt(this.value);
		if (number > 0) {
			wishlists[currentlySelectedWishlist][item.id] = this.value = number;
			updateWishlistBottomMessage();
		} else this.value = wishlists[currentlySelectedWishlist][item.id];
	}
	let deleteButton = div.appendChild(document.createElement("button"));
	deleteButton.setAttribute("class", "delete-entry-button");
	deleteButton.innerText = "×";
	deleteButton.onclick = function() {
		removeWishlistEntry(item);
	}
	div.setAttribute("item-id", item.id);
	item.img.setAttribute("wishlisted", "true");
	updateWishlistBottomMessage();
	saveState();
}

function removeWishlistEntry(item) {
	if (!wishlists[currentlySelectedWishlist][item.id]) return;
	let div = document.querySelector(".wishlist-entry[item-id=\""+item.id+"\"]");
	div.remove();
	delete wishlists[currentlySelectedWishlist][item.id];
	item.img.setAttribute("wishlisted", "false");
	updateWishlistBottomMessage();
	saveState();
}

function makeParticle(x, y, text) {
	let div = document.body.appendChild(document.createElement("div"));
	div.innerText = text;
	div.style.fontSize = "0.875rem";
	div.style.userSelect = "none";
	div.style.position = "fixed";
	div.style.left = x + "px";
	div.style.top = (y-16) + "px";
	div.style.transition = "1.5s";
	div.style.transform = "translate(-50%, -50%)";
	div.style.color = "var(--gray)";
	div.style.background = "var(--black)";
	div.style.padding = "0.25rem 0.5rem";
	div.style.borderRadius = "0.25rem";
	div.style.border = "solid 2px var(--gray)";
	div.style.pointerEvents = "none";
	setTimeout(function() {
		div.style.opacity = 0;
		div.style.top = (y-32) + "px";
	}, 1);
	setTimeout(function() {
		div.remove();
	}, 1500);
}

function copyDropCodes(x, y) {
	let output = [];
	let acc = [];
	for (let id in wishlists[currentlySelectedWishlist]) for (let i = 0; i < wishlists[currentlySelectedWishlist][id] && i < 100; i++) {
		acc.push(id);
		if (acc.length == 7) {
			output.push(".drop " + acc.join(" "));
			acc = [];
		}
	}
	if (acc.length) output.push(".drop " + acc.join(" "));
	if (!output.length) return;
	if (window.isSecureContext) {
		navigator.clipboard.writeText(output.join('\n'));
		makeParticle(x, y, 'Copied to clipboard');
	} else {
		let modal = prepareModal();
		if (!modal) return;
		modal.style.width = "32rem";
		modal.appendChild(document.createElement("p")).innerText = "Sorry, I can't write directly to your computer's clipboard. Copy the drop codes manually:";
		let div = modal.appendChild(document.createElement("p"));
		div.innerText = output.join("\n");
		div.style.padding = "1rem";
		div.style.border = "solid 2px var(--white)";
		div.style.borderRadius = "0.25rem";
		div.style.userSelect = "all";
	}
}

let currentlyInvestigatedItem = null;
function investigateItem(item) {
	let infoBox = document.querySelector("#investigate-info");
	while (infoBox.firstChild) infoBox.firstChild.remove();
	if (item == currentlyInvestigatedItem) return;
	if (item == null) {
		currentlyInvestigatedItem = null;
		document.querySelector("#investigate").style.display = "none";
		return;
	}
	currentlyInvestigatedItem = item;
	document.querySelector("#investigate-display").src = item.filename;
	document.querySelector("#investigate").style.display = "block";
	if (item.requiredAdvancedFilter != "") document.querySelector("#investigate-display").setAttribute("advancedfilter", item.requiredAdvancedFilter);
	else document.querySelector("#investigate-display").removeAttribute("advancedfilter");
	let itemName = infoBox.appendChild(document.createElement("div"));
	itemName.innerText = item.name;
	for (let c of item.customization) {
		let b = itemName.appendChild(document.createElement("b"));
		b.innerText = "(" + c + ")";
	}
	if (item.tags.length) {
		let tagContainer = infoBox.appendChild(document.createElement("div"));
		for (let tag of item.tags) {
			let i = tagContainer.appendChild(document.createElement("i"));
			i.innerText = tagDisplayName[tag];
		}
	}
	if (item.patternRule != "") {
		let [contexts, part] = item.patternRule.split(":");
		let patternTypes = [];
		if (contexts.includes("C")) patternTypes.push("custom patterns");
		if (contexts.includes("S")) patternTypes.push("Sable patterns");
		let comment = infoBox.appendChild(document.createElement("div"));
		comment.innerText = "The " + part.toLowerCase() + " on this item can also use "+patternTypes.join(" and ")+".";
		comment.style.marginTop = "0.25rem";
		comment.style.fontSize = "0.875rem";
		comment.style.color = "var(--gray)";
	}
}

function updateWishlistBottomMessage() {
	let count = Object.keys(wishlists[currentlySelectedWishlist]).map(x => wishlists[currentlySelectedWishlist][x]).reduce((a,b) => a+b, 0);
	let text = count + " items selected";
	if (count == 1) text = count + " item selected";
	if (count == 0) text = "No items selected yet";
	document.querySelector("#wishlist-entries-bottom-message").innerText = text;
}

function presentResults() {
	let results = document.querySelector("#results");
	while (results.firstChild) results.firstChild.remove();
	
	let selectedTagsList = Object.keys(selectedTags);
	for (let item of items) {
		item.matchingScore = 0;
		for (let tag of selectedTagsList) if (item.tags.includes(tag)) item.matchingScore++;
	}
	
	let itemNameCriteria = document.querySelector("#search-parameters-name").value;
	itemNameCriteria = itemNameCriteria.replaceAll(" AND ", " & ").replaceAll(" OR ", " | ");
	itemNameCriteria = itemNameCriteria.split("&").map(x => x.split("|").map(y => prepareTextForSearch(y))); //conjunctive normal form
	
	let presentableItems = [];
	for (let item of items) {
		let presentable = true;
		for (let clause of itemNameCriteria) {
			let anySatisfied = false;
			for (let text of clause) if (item.nameForSearch.includes(text)) anySatisfied = true;
			if (!anySatisfied) presentable = false
		}
		if (!acceptableCategories[item.category]) presentable = false;
		if (selectedTagsList.length && !item.matchingScore) presentable = false;
		if (!advancedFilters[item.requiredAdvancedFilter]) presentable = false;
		if (presentable) presentableItems.push(item);
	}
	
	presentableItems.sort((a,b) => b.matchingScore - a.matchingScore);
	
	let numberOfMatches = undefined;
	for (let item of presentableItems) {
		if (selectedTagsList.length && item.matchingScore != numberOfMatches) {
			let matchingDeclarationText = "Matches " + item.matchingScore + " tag" + (item.matchingScore==1 ? "" : "s");
			if (item.matchingScore == selectedTagsList.length) {
				if (selectedTagsList.length == 1) matchingDeclarationText = "Matches <span>" + tagDisplayName[selectedTagsList[0]] + "</span>";
				else if (selectedTagsList.length == 2) matchingDeclarationText = "Matches both <span>" + tagDisplayName[selectedTagsList[0]] + "</span> and <span>" + tagDisplayName[selectedTagsList[1]] + "</span>";
				else matchingDeclarationText = matchingDeclarationText.replace("Matches ", "Matches all ");
			}
			if (item.matchingScore == 1 && selectedTagsList.length == 2) {
				matchingDeclarationText = "Matches either <span>" + tagDisplayName[selectedTagsList[0]] + "</span> or <span>" + tagDisplayName[selectedTagsList[1]] + "</span>";
			}
			let declaration = results.appendChild(document.createElement("div"));
			declaration.innerHTML = matchingDeclarationText;
			declaration.setAttribute("class", "results-declaration");
			numberOfMatches = item.matchingScore;
			
		}
		results.appendChild(item.img);
		item.img.setAttribute("wishlisted", wishlists[currentlySelectedWishlist][item.id] ? "true" : "false");
	}
	
	if (!results.firstChild) {
		let declaration = results.appendChild(document.createElement("div"));
		declaration.setAttribute("class", "results-declaration");
		declaration.style.color = "var(--gray)";
		declaration.innerText = "No results";
	}
	
	saveState();
}

presentResults();
updateWishlistBottomMessage();
updateCategoryDisplay();
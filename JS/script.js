// This is the main JavaScript file for the Family Tree Creator.
// It handles all the logic for adding, deleting, and visualizing the family tree.
// It uses D3.js for the tree visualization, but all other logic is pure JavaScript.

document.addEventListener('DOMContentLoaded', () => {

    // --- Message Modal Functionality ---
    const messageModal = document.getElementById('message-modal');
    const modalMessage = document.getElementById('modal-message');
    const closeButton = document.querySelector('.close-button');

    /**
     * @description Displays a message to the user using the custom modal.
     * @param {string} message The text to be displayed in the modal.
     */
    function showMessage(message) {
        modalMessage.textContent = message;
        messageModal.style.display = 'flex';
    }

    // Event listener to close the modal when the close button is clicked.
    closeButton.addEventListener('click', () => {
        messageModal.style.display = 'none';
    });

    // Event listener to close the modal if the user clicks anywhere outside of it.
    window.addEventListener('click', (event) => {
        if (event.target == messageModal) {
            messageModal.style.display = 'none';
        }
    });

    // --- Family Tree Data and DOM Element References ---
    let familyMembers = [];
    let nextId = 1;

    const addMemberForm = document.getElementById('add-member-form');
    const memberNameInput = document.getElementById('member-name');
    const relationshipSelect = document.getElementById('relationship');
    const relatedToSelect = document.getElementById('related-to');
    const relatedToLabel = relatedToSelect.previousElementSibling;
    const isChildOfBothCheckbox = document.getElementById('is-child-of-both');
    const bothParentsContainer = document.getElementById('both-parents-container');
    const familyTreeContainer = document.getElementById('family-tree-container');
    const downloadImgBtnPage = document.getElementById('download-img-btn-page');
    const downloadImgBtnNav = document.getElementById('download-img-btn-nav');
    
    /**
     * @description This function dynamically updates all the dropdown menus
     * with existing family members.
     */
    function updateDropdowns() {
        // Clear the dropdown first
        relatedToSelect.innerHTML = '';
        
        // Add the default "Select a member" option.
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = `-- Select a member --`;
        relatedToSelect.appendChild(defaultOption);

        // Iterate through the `familyMembers` array and create an option
        // for each member.
        familyMembers.forEach(member => {
            const option = document.createElement('option');
            option.value = member.id;
            option.textContent = member.name;
            relatedToSelect.appendChild(option);
        });
    }

    /**
     * @description This is the core function that visualizes the family tree.
     * It uses a custom, manual layout and drawing system to handle all relationship types.
     */
    function drawTree() {
        if (familyMembers.length === 0) {
            familyTreeContainer.innerHTML = '<p class="familytree-instructions">Start by adding the first member of your family tree.</p>';
            return;
        }

        familyTreeContainer.innerHTML = '';
        const containerRect = familyTreeContainer.getBoundingClientRect();
        const width = containerRect.width;
        const height = containerRect.height;
        const nodeSpacingX = 150;
        const nodeSpacingY = 150;
        const spouseSpacing = 100;

        // Create the SVG element and a group for all content.
        const svg = d3.select(familyTreeContainer).append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g");

        // --- Step 1: Manually calculate the positions of all nodes. ---
        const nodes = new Map();
        const processed = new Set();
        let maxX = 0;
        let minX = 0;

        function positionNode(memberId, x, y) {
            if (processed.has(memberId)) return;
            processed.add(memberId);

            const member = familyMembers.find(m => m.id === memberId);
            if (!member) return;

            nodes.set(memberId, { id: memberId, name: member.name, x, y, relationship: member.relationship });
            maxX = Math.max(maxX, x);
            minX = Math.min(minX, x);

            // Position spouses
            if (member.relationship !== 'spouse') {
                const spouse = familyMembers.find(m => m.relatedTo === memberId && m.relationship === 'spouse');
                if (spouse) {
                    positionNode(spouse.id, x + spouseSpacing, y);
                }
            }

            // Position children
            const children = familyMembers.filter(m => m.parents && m.parents.includes(memberId));
            if (children.length > 0) {
                const childSpacing = children.length > 1 ? nodeSpacingX : 0;
                const startX = x - (children.length - 1) * childSpacing / 2;
                children.forEach((child, i) => {
                    positionNode(child.id, startX + i * childSpacing, y + nodeSpacingY);
                });
            }
        }

        // Start positioning from the root member.
        const rootMember = familyMembers.find(m => m.relationship === "root");
        if (rootMember) {
            positionNode(rootMember.id, 0, 0);
        } else {
            showMessage("A family tree must have a root member to be drawn. Please add one first.");
            return;
        }
        
        // Adjust all nodes to be centered horizontally.
        const offsetX = -minX - (maxX - minX) / 2;
        nodes.forEach(node => {
            node.x += offsetX;
        });
        
        // --- Step 2: Draw the links first. This ensures they appear behind the nodes. ---
        familyMembers.forEach(member => {
            const memberNode = nodes.get(member.id);
            if (!memberNode) return;

            // Draw spouse links
            if (member.relationship === "spouse") {
                const partnerNode = nodes.get(member.relatedTo);
                if (partnerNode) {
                    svg.append("path")
                        .attr("class", "link spouse")
                        .attr("d", `M${partnerNode.x},${partnerNode.y} L${memberNode.x},${memberNode.y}`);
                }
            }

            // Draw parent-child links
            if (member.parents && member.parents.length > 0) {
                const parentNodes = member.parents.map(pId => nodes.get(pId)).filter(p => p);
                if (parentNodes.length === 1) {
                    const parentNode = parentNodes[0];
                    svg.append("path")
                        .attr("class", "link parent-child")
                        .attr("d", `M${parentNode.x},${parentNode.y} L${memberNode.x},${memberNode.y}`);
                } else if (parentNodes.length === 2) {
                    const [parent1, parent2] = parentNodes;
                    const coupleMidpointX = (parent1.x + parent2.x) / 2;
                    const coupleY = parent1.y;

                    svg.append("path")
                        .attr("class", "link child-couple-connector")
                        .attr("d", `M${coupleMidpointX},${coupleY} L${memberNode.x},${memberNode.y}`);
                }
            }
        });

        // --- Step 3: Draw the nodes (circles and text). ---
        const nodeElements = svg.selectAll(".node")
            .data(Array.from(nodes.values()))
            .enter().append("g")
            .attr("class", d => `node ${d.relationship}`)
            .attr("transform", d => `translate(${d.x},${d.y})`);

        // Append text and then center it correctly within the group
        const textElements = nodeElements.append("text")
            .text(d => d.name)
            .attr("dy", "0.35em"); // This centers the text vertically

        // Append circles, and size them based on the text bounding box for a better fit
        nodeElements.insert("circle", "text")
            .attr("r", function() {
                const bbox = this.parentNode.getBBox();
                // Use a fixed padding to make the circle a bit larger than the text
                const padding = 10;
                return Math.max(bbox.width, bbox.height) / 2 + padding;
            });
        
        // --- Step 4: Correctly position and scale the entire SVG ---
        // Get the bounding box of the entire drawing group
        const bbox = svg.node().getBBox();
        const padding = 50;

        // Set the SVG's viewBox to encompass the entire tree with padding
        d3.select(svg.node().parentNode)
            .attr("viewBox", `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`)
            .attr("preserveAspectRatio", "xMidYMid meet");
    }

    // --- Form Submission Handling ---
    addMemberForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const memberName = memberNameInput.value.trim();
        const relationship = relationshipSelect.value;
        const relatedTo = relatedToSelect.value;
        const isChildOfBoth = isChildOfBothCheckbox.checked;
        let newMember;
        
        if (!memberName) {
            showMessage("Please enter a member's name.");
            return;
        }

        if (relationship === 'root') {
            if (familyMembers.length > 0) {
                showMessage("A family tree can only have one root member.");
                return;
            }
            newMember = { id: nextId++, name: memberName, relatedTo: null, relationship: 'root', parents: [] };
        } else {
            if (!relatedTo) {
                showMessage("Please select a person to relate this member to.");
                return;
            }
            if (relatedTo == nextId.toString()) {
                showMessage("A person cannot be related to themselves.");
                return;
            }

            if (relationship === 'parent') {
                const childMember = familyMembers.find(m => m.id == relatedTo);
                if (!childMember) {
                    showMessage("Selected child not found.");
                    return;
                }

                if (childMember.parents && childMember.parents.length >= 2) {
                    showMessage("This child already has two parents.");
                    return;
                }

                newMember = { id: nextId++, name: memberName, relationship: 'parent', relatedTo: relatedTo };
                
                childMember.parents = childMember.parents || [];
                childMember.parents.push(newMember.id);
                
            } else if (relationship === 'child') {
                const parentMember = familyMembers.find(m => m.id == relatedTo);
                if (!parentMember) {
                    showMessage("Selected parent not found.");
                    return;
                }

                let newParents = [parentMember.id];
                if (isChildOfBoth) {
                    // Corrected logic to find the spouse regardless of which partner is selected.
                    let spouse = null;
                    if (parentMember.relationship === 'spouse') {
                        // If the selected person is a spouse, find their partner.
                        spouse = familyMembers.find(m => m.id == parentMember.relatedTo);
                    } else {
                        // If the selected person is not a spouse, find their spouse.
                        spouse = familyMembers.find(m => m.relatedTo == parentMember.id && m.relationship === 'spouse');
                    }

                    if (spouse) {
                        newParents.push(spouse.id);
                    } else {
                        showMessage("The selected person does not have a spouse to add as the second parent. Please add their spouse first.");
                        return;
                    }
                }

                newMember = { id: nextId++, name: memberName, parents: newParents, relationship: 'child', relatedTo: relatedTo };
            } else if (relationship === 'sibling') {
                const relatedMember = familyMembers.find(m => m.id == relatedTo);
                if (!relatedMember || !relatedMember.parents || relatedMember.parents.length === 0) {
                    showMessage("The selected member must have a parent to add a sibling.");
                    return;
                }
                newMember = { id: nextId++, name: memberName, parents: relatedMember.parents, relationship: 'sibling', relatedTo: relatedMember.parents[0] };
            } else if (relationship === 'spouse') {
                const hasSpouse = familyMembers.some(m => m.relatedTo == relatedTo && m.relationship === 'spouse');
                if (hasSpouse) {
                    showMessage("The selected member already has a spouse.");
                    return;
                }
                newMember = { id: nextId++, name: memberName, relatedTo: relatedTo, relationship: 'spouse' };
            }
        }
        
        if (newMember) {
            familyMembers.push(newMember);
            updateDropdowns();
            drawTree();
            addMemberForm.reset();
        }
    });

    // This is the crucial part that handles the dynamic UI.
    relationshipSelect.addEventListener('change', () => {
        const relationship = relationshipSelect.value;
        if (relationship === 'root') {
            relatedToSelect.style.display = 'none';
            relatedToLabel.style.display = 'none';
            bothParentsContainer.style.display = 'none';
        } else if (relationship === 'child') {
            relatedToSelect.style.display = 'block';
            relatedToLabel.style.display = 'block';
            bothParentsContainer.style.display = 'block';
        } else {
            relatedToSelect.style.display = 'block';
            relatedToLabel.style.display = 'block';
            bothParentsContainer.style.display = 'none';
        }
        updateDropdowns();
    });

    // --- Image Download Functionality ---
    /**
     * @description Captures the family tree SVG as a PNG image and downloads it.
     */
    function downloadImage() {
        const treeContainer = document.getElementById('family-tree-container');
        if (!treeContainer || !treeContainer.querySelector('svg')) {
            showMessage("There is no family tree to download yet. Please add some members first.");
            return;
        }

        // To correctly capture the SVG, we need to create a temporary container.
        const tempContainer = document.createElement('div');
        tempContainer.style.width = treeContainer.scrollWidth + 'px';
        tempContainer.style.height = treeContainer.scrollHeight + 'px';
        tempContainer.appendChild(treeContainer.querySelector('svg').cloneNode(true));
        document.body.appendChild(tempContainer);

        html2canvas(tempContainer).then(canvas => {
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = 'family-tree.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            document.body.removeChild(tempContainer);
        }).catch(error => {
            console.error("Error during image download:", error);
            showMessage("An error occurred while trying to download the image.");
            if (tempContainer) document.body.removeChild(tempContainer);
        });
    }

    // Event listeners for the download buttons on the page and in the nav.
    downloadImgBtnPage.addEventListener('click', downloadImage);
    if (downloadImgBtnNav) {
        downloadImgBtnNav.addEventListener('click', downloadImage);
    }
    
    // Initial calls when the page loads to set up the dropdowns and the empty tree view.
    updateDropdowns();
    drawTree();
});
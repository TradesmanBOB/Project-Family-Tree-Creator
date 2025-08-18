// This is the main JavaScript file for the Family Tree Creator.
// It handles all the logic for adding, deleting, and visualizing the family tree.
// It uses D3.js for the tree visualization.

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
        if (modalMessage) {
            modalMessage.textContent = message;
        }
        if (messageModal) {
            messageModal.style.display = 'flex';
        }
    }

    // Event listener to close the modal when the close button is clicked.
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            if (messageModal) {
                messageModal.style.display = 'none';
            }
        });
    }

    // Event listener to close the modal if the user clicks anywhere outside of it.
    window.addEventListener('click', (event) => {
        if (messageModal && event.target == messageModal) {
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
    const treeContainer = document.getElementById('family-tree-container');
    
    // Check for optional elements to prevent crashes
    const downloadImgBtnPage = document.getElementById('download-img-btn-page');
    const downloadImgBtnNav = document.getElementById('download-img-btn-nav');
    const clearTreeBtn = document.getElementById('clear-tree-btn');

    // --- Main Functions ---

    /**
     * @description Converts a flat array of family members into a hierarchical structure for D3.js.
     * @returns {object} The root node of the hierarchical tree.
     */
    function buildTreeData() {
        if (familyMembers.length === 0) {
            return null;
        }

        const dataMap = new Map();
        familyMembers.forEach(member => {
            dataMap.set(member.id, { ...member, children: [] });
        });

        let rootNode = null;
        dataMap.forEach(member => {
            if (member.parentId === null) {
                rootNode = member;
            } else {
                const parent = dataMap.get(member.parentId);
                if (parent) {
                    parent.children.push(member);
                }
            }
        });

        // Sort children for consistent layout
        if (rootNode) {
            sortChildren(rootNode);
        }
        return rootNode;
    }

    /**
     * @description Sorts the children of a node recursively for consistent visualization.
     * @param {object} node The node to sort.
     */
    function sortChildren(node) {
        if (node.children) {
            node.children.sort((a, b) => a.id - b.id);
            node.children.forEach(sortChildren);
        }
    }

    /**
     * @description Draws the family tree visualization using D3.js.
     */
    function drawTree() {
        const treeData = buildTreeData();
        if (!treeData || !treeContainer) {
            if (treeContainer) {
                treeContainer.innerHTML = '<p class="familytree-instructions">Your tree will appear here. Add the first member to get started!</p>';
            }
            return;
        }

        // Clear previous SVG
        treeContainer.innerHTML = '';
        const margin = { top: 50, right: 90, bottom: 50, left: 90 };
        const width = 1000 - margin.left - margin.right;
        const height = 800 - margin.top - margin.bottom;

        const svg = d3.select(treeContainer)
            .append("svg")
            .attr("width", '100%')
            .attr("height", '100%')
            .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const treeLayout = d3.tree().size([width, height]);
        const root = d3.hierarchy(treeData, d => d.children);
        const nodes = treeLayout(root);

        // Links
        const link = svg.selectAll(".link")
            .data(nodes.links())
            .enter().append("path")
            .attr("class", "link")
            .attr("d", d3.linkVertical()
                .x(d => d.x)
                .y(d => d.y));

        // Nodes
        const node = svg.selectAll(".node")
            .data(root.descendants())
            .enter().append("g")
            .attr("class", d => `node ${d.children ? "node--internal" : "node--leaf"}`)
            .attr("transform", d => `translate(${d.x},${d.y})`);

        node.append("circle")
            .attr("r", 30);

        node.append("text")
            .attr("dy", ".35em")
            .text(d => d.data.name);
    }
    
    /**
     * @description Updates the "Related to" dropdown with existing family members.
     */
    function updateDropdowns() {
        if (!relatedToSelect) return;
        
        relatedToSelect.innerHTML = '';
        const noMemberOption = document.createElement('option');
        noMemberOption.value = '';
        noMemberOption.textContent = '-- Select a member --';
        relatedToSelect.appendChild(noMemberOption);
        
        if (familyMembers.length === 0) {
            relationshipSelect.value = 'root';
            relationshipSelect.disabled = true;
            relatedToSelect.disabled = true;
        } else {
            relationshipSelect.disabled = false;
            relatedToSelect.disabled = false;
            familyMembers.forEach(member => {
                const option = document.createElement('option');
                option.value = member.id;
                option.textContent = member.name;
                relatedToSelect.appendChild(option);
            });
        }
    }
    
    /**
     * @description Validates and adds a new member to the family tree data.
     */
    function addNewMember() {
        const name = memberNameInput.value.trim();
        const relationship = relationshipSelect.value;
        const relatedToId = parseInt(relatedToSelect.value, 10);
    
        if (!name) {
            showMessage("Please enter a member's name.");
            return;
        }
    
        // Handle the case of the first member
        if (familyMembers.length === 0) {
            if (relationship !== 'root') {
                showMessage("The first member must be the 'Root Member'.");
                return;
            }
            familyMembers.push({ id: nextId, name, parentId: null });
            nextId++;
        } else {
            // Handle subsequent members
            if (relationship === 'root') {
                showMessage("A root member already exists. Please select a different relationship.");
                return;
            }
    
            const relatedToMember = familyMembers.find(member => member.id === relatedToId);
            if (!relatedToMember) {
                showMessage("Please select an existing family member to relate to.");
                return;
            }
    
            if (relationship === 'child') {
                familyMembers.push({ id: nextId, name, parentId: relatedToMember.id });
                nextId++;
            } else if (relationship === 'sibling') {
                if (relatedToMember.parentId === null) {
                    showMessage("Cannot add a sibling to the root member without a shared parent.");
                    return;
                }
                familyMembers.push({ id: nextId, name, parentId: relatedToMember.parentId });
                nextId++;
            } else if (relationship === 'parent') {
                const newParent = { id: nextId, name, parentId: null };
                familyMembers.push(newParent);
                relatedToMember.parentId = newParent.id; // Update the child's parent ID
                nextId++;
            } else if (relationship === 'spouse') {
                // Find the spouse's parentId, which is the same as the relatedToMember
                familyMembers.push({ id: nextId, name, parentId: relatedToMember.parentId, spouseOf: relatedToMember.id });
                nextId++;
            }
        }
    
        memberNameInput.value = '';
        updateDropdowns();
        drawTree();
    }
    
    /**
     * @description Resets the family tree to its initial empty state.
     */
    function clearTree() {
        familyMembers = [];
        nextId = 1;
        updateDropdowns();
        drawTree();
        showMessage("Family tree has been cleared.");
    }
    
    // --- Event Listeners ---
    if (addMemberForm) {
        addMemberForm.addEventListener('submit', (event) => {
            event.preventDefault();
            addNewMember();
        });
    }

    if (clearTreeBtn) {
        clearTreeBtn.addEventListener('click', clearTree);
    }
    
    // Function to handle image download
    function downloadImage() {
        if (!treeContainer) {
            showMessage("The family tree container is missing. Cannot download.");
            return;
        }
    
        const svg = treeContainer.querySelector('svg');
        if (!svg) {
            showMessage("No family tree to download. Please create one first.");
            return;
        }
    
        // Use html2canvas as it's a more reliable method for this context
        html2canvas(treeContainer).then(canvas => {
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = 'family-tree.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showMessage("Your family tree has been downloaded as a PNG!");
        }).catch(error => {
            console.error("Error during image download:", error);
            showMessage("An error occurred while trying to download the image.");
        });
    }
    
    // Event listeners for the download buttons on the page and in the nav.
    if (downloadImgBtnPage) {
        downloadImgBtnPage.addEventListener('click', downloadImage);
    }
    if (downloadImgBtnNav) {
        downloadImgBtnNav.addEventListener('click', downloadImage);
    }

    // Initial calls when the page loads to set up the dropdowns and the empty tree view.
    updateDropdowns();
    drawTree();
});
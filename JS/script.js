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
        if (event.target === messageModal) {
            messageModal.style.display = 'none';
        }
    });

    // --- Family Tree Data and DOM Element References ---
    let familyMembers = [];
    let nextId = 1;

    // DOM elements for the form inputs and dropdowns
    const addMemberForm = document.getElementById('add-member-form');
    const memberNameInput = document.getElementById('member-name');
    const relatedToDropdown = document.getElementById('related-to');
    const relationshipDropdown = document.getElementById('relationship');

    // Container for the spouse checkbox, initially hidden
    const spouseOptionContainer = document.getElementById('spouse-option-container');
    const isSpouseCheckbox = document.getElementById('is-spouse');

    // Buttons for adding members and downloading the family tree image
    const downloadImgBtnPage = document.getElementById('download-img-btn-page');
    const downloadImgBtnNav = document.getElementById('download-img-btn-nav');

    // Container for the family tree visualization
    const treeContainer = document.getElementById('family-tree-container');

    // --- Dynamic UI Updates ---

    /**
     * @description Updates the 'Related to' dropdown with the names of existing family members.
     * This ensures a new member can be linked to any person already in the tree.
     */
    function updateDropdowns() {
        relatedToDropdown.innerHTML = '';
        if (familyMembers.length === 0) {
            // If the tree is empty, the first member is the root and has no parent. And the dropdowns are disabled.
            const option = document.createElement('option');
            option.value = 'root';
            option.textContent = 'This is the first family member (Root)';
            relatedToDropdown.appendChild(option);
            relatedToDropdown.disabled = true;
            relationshipDropdown.disabled = true;
        } else {
            // Populate the 'Related to' dropdown with family members that already are in the tree.
            relatedToDropdown.disabled = false;
            relationshipDropdown.disabled = false;
            familyMembers.forEach(member => {
                const option = document.createElement('option');
                option.value = member.id;
                option.textContent = member.name;
                relatedToDropdown.appendChild(option);
            });
        }
    }

    /*  @description Toggles the visibility of the spouse checkbox based on the selected relationship. 
        The spouse checkbox is only shown when 'spouse' is selected in the relationship dropdown.   */
    function updateRelatedToDropdown() {
        const selectedRelationship = relationshipDropdown.value;
        const selectedRelatedToId = relatedToDropdown.value;
        const selectedRelatedToMember = familyMembers.find(m => m.id == selectedRelatedToId);

        if (selectedRelationship === 'spouse') {
            spouseOptionContainer.style.display = 'flex';
        } else {
            spouseOptionContainer.style.display = 'none';
            isSpouseCheckbox.checked = false; // Reset the checkbox
        }
    }

    // Event listener for the relationship dropdown change to show/hide spouse checkbox
    relationshipDropdown.addEventListener('change', updateRelatedToDropdown);

    // --- Core Application Logic ---
    /**
     * @description Adds a new member to the familyMembers array based on form input.
     * It handles validation and assigns parent/spouse IDs correctly.
     */
    function addMember() {
        const name = memberNameInput.value.trim();
        const relatedToId = relatedToDropdown.value;
        const relationship = relationshipDropdown.value;
        const isSpouse = isSpouseCheckbox.checked;

        if (!name) {
            showMessage("Please enter a name for the family member.");
            return;
        }

        // Handle adding the first member (the root)
        if (familyMembers.length === 0) {
            familyMembers.push({
                id: nextId,
                name: name,
                parentId: null,
                isSpouse: false
            });
            nextId++;
            return true;
        }

        const relatedToMember = familyMembers.find(m => m.id == relatedToId);
        if (!relatedToMember) {
            showMessage("Please select a valid member to relate to.");
            return;
        }

        // Handle spouse relationship
        if (relationship === 'spouse' && !isSpouse) {
            showMessage("To add a spouse, you must check the 'This member is the spouse' box.");
            return;
        }
        
        // Find existing spouse if one exists
        const existingSpouse = familyMembers.find(m => m.parentId === relatedToMember.id && m.isSpouse);
        if (isSpouse && existingSpouse) {
            showMessage(`${relatedToMember.name} Already has a spouse. This is a monogamous site (one spouse).`);
            return;
        }

        // If the member is a spouse, their parent is the relatedToMember
        if (isSpouse) {
            familyMembers.push({
                id: nextId,
                name: name,
                parentId: relatedToMember.id,
                isSpouse: true
            });
        } else {
            // Logic for children and siblings
            let parentId = null;
            if (relationship === 'child') {
                parentId = relatedToMember.id;
            } else if (relationship === 'sibling') {
                parentId = relatedToMember.parentId;
                // Siblings must have a parent
                if (parentId === null) {
                    showMessage("A sibling must be related to a member who has a parent.");
                    return;
                }
            } else {
                showMessage("Invalid relationship type.");
                return;
            }

            familyMembers.push({
                id: nextId,
                name: name,
                parentId: parentId,
                isSpouse: false
            });
        }
        nextId++;
        return true;
    }


    // --- D3.js Tree Visualization ---
    
    /**
     * @description Renders the family tree visualization using D3.js.
     * This function is responsible for converting the flat familyMembers array into a
     * hierarchical structure and drawing the nodes and links.
     */
    function drawTree() {
        // Clear any previous SVG
        treeContainer.innerHTML = '';

        if (familyMembers.length === 0) {
            // Display a message if the tree is empty
            const message = document.createElement('div');
            message.className = 'familytree-instructions';
            message.textContent = 'Start by adding a family member above to create your tree!';
            treeContainer.appendChild(message);
            return;
        }

        // Convert the flat array to a hierarchical structure
        const dataMap = familyMembers.reduce((map, member) => {
            map[member.id] = member;
            return map;
        }, {});
        
        let root = familyMembers.find(m => m.parentId === null);
        if (!root) {
            showMessage("The family tree is corrupted. The root member is missing.");
            return;
        }

        const findChildren = (member) => {
            member.children = familyMembers.filter(m => m.parentId === member.id && !m.isSpouse);
            member.spouse = familyMembers.find(m => m.parentId === member.id && m.isSpouse);
            member.children.forEach(findChildren);
        };
        findChildren(root);

        // Set up the D3.js tree layout
        const margin = { top: 40, right: 90, bottom: 50, left: 90 };
        const width = treeContainer.clientWidth - margin.left - margin.right;
        const height = treeContainer.clientHeight - margin.top - margin.bottom;

        const svg = d3.select(treeContainer).append('svg')
            .attr('width', width + margin.right + margin.left)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const treeLayout = d3.tree().size([width, height]);
        const rootNode = d3.hierarchy(root, d => d.children);
        const treeData = treeLayout(rootNode);

        // Add links (lines)
        svg.selectAll('.link')
            .data(treeData.links())
            .enter().append('path')
            .attr('class', 'link')
            .attr('d', d3.linkVertical()
                .x(d => d.x)
                .y(d => d.y));

        // Add nodes (circles and text)
        const nodes = svg.selectAll('.node')
            .data(treeData.descendants())
            .enter().append('g')
            .attr('class', d => `node${d.children ? ' node--internal' : ' node--leaf'}`)
            .attr('transform', d => `translate(${d.x},${d.y})`);

        nodes.append('circle')
            .attr('r', 20);

        // Add text to the nodes
        nodes.append('text')
            .attr('dy', 5)
            .text(d => d.data.name);

        // Add spouse nodes and links
        const spouseNodes = nodes.filter(d => d.data.spouse);
        spouseNodes.each(function(d) {
            const node = d3.select(this);
            const spouse = d.data.spouse;
            const spouseNode = {
                data: spouse,
                x: d.x + 50, // Position spouse next to the main member
                y: d.y
            };

            // Draw spouse link
            svg.append('path')
                .attr('class', 'link')
                .attr('d', `M${d.x},${d.y} L${spouseNode.x},${spouseNode.y}`);

            // Draw spouse node
            const spouseGroup = svg.append('g')
                .attr('class', 'node spouse-node')
                .attr('transform', `translate(${spouseNode.x},${spouseNode.y})`);

            spouseGroup.append('circle')
                .attr('r', 20)
                .style('fill', '#1da34a') // Different color for spouses
                .style('stroke', '#3f0');

            spouseGroup.append('text')
                .attr('dy', 5)
                .text(spouse.name);
        });
    }

    // --- Form Submission and Event Handling ---

    // Event listener for the form submission
    addMemberForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (addMember()) {
            // Only update and redraw if the member was successfully added
            updateDropdowns();
            drawTree();
            memberNameInput.value = ''; // Clear the input field
        }
    });
    
    // --- Image Download Functionality ---
    
    /**
     * @description Uses html2canvas to capture the family tree SVG and download it as a PNG image.
     * It temporarily creates a container to ensure the entire SVG is captured correctly.
     */
    function downloadImage() {
        const svgElement = treeContainer.querySelector('svg');
        if (!svgElement) {
            showMessage("There is no family tree to download yet.");
            return;
        }

        // To correctly capture the SVG, we need to create a temporary container.
        const tempContainer = document.createElement('div');
        tempContainer.style.width = treeContainer.scrollWidth + 'px';
        tempContainer.style.height = treeContainer.scrollHeight + 'px';
        tempContainer.appendChild(svgElement.cloneNode(true));
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

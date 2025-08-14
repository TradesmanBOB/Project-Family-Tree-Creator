// JavaScript for Family Tree Creator
// This is the main JavaScript file for the Family Tree Creator.
// It handles all the logic for adding, deleting, and visualizing the family tree.

document.addEventListener('DOMContentLoaded', () => {
    // A simple custom modal to display messages to the user.
    const messageModal = document.getElementById('message-modal');
    const modalMessage = document.getElementById('modal-message');
    const closeButton = document.querySelector('.close-button');

    function showMessage(message) {
        modalMessage.textContent = message;
        messageModal.style.display = 'block';
    }

    closeButton.addEventListener('click', () => {
        messageModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target == messageModal) {
            messageModal.style.display = 'none';
        }
    });

    // An array to store the family members. Each member is an object.
    // The structure will be: { id: 1, name: "Name", relatedTo: 0, relationship: "root" }
    let familyMembers = [];
    let nextId = 1; // A simple counter to assign unique IDs to each new member.

    const addMemberForm = document.getElementById('add-member-form');
    const memberNameInput = document.getElementById('member-name');
    const relatedToSelect = document.getElementById('related-to');
    const relationshipSelect = document.getElementById('relationship');
    const familyTreeContainer = document.getElementById('family-tree-container');

    const downloadImgBtnPage = document.getElementById('download-img-btn-page');

    /**
     * @description This function updates the 'Related to' dropdown with existing family members.
     * It ensures the user can select an existing member to link a new one to.
     */
    function updateRelatedToDropdown() {
        // Clear existing options
        relatedToSelect.innerHTML = '<option value="0">This is the Root of the tree</option>';
        familyMembers.forEach(member => {
            const option = document.createElement('option');
            option.value = member.id;
            option.textContent = member.name;
            relatedToSelect.appendChild(option);
        });
    }

    /**
     * @description This is the core function that visualizes the family tree using D3.js.
     * It takes the `familyMembers` array and renders a hierarchical tree structure.
     */
    function drawTree() {
        // Check if there are any members to draw. If not, clear the container.
        if (familyMembers.length === 0) {
            familyTreeContainer.innerHTML = '<p class="familytree-instructions">Start by adding the first member of your family tree.</p>';
            return;
        }

        // Clear previous SVG content to redraw the tree
        familyTreeContainer.innerHTML = '';

        // D3.js setup for tree visualization
        const margin = {top: 40, right: 90, bottom: 50, left: 90};
        const width = 960 - margin.left - margin.right;
        const height = 500 - margin.top - margin.bottom;

        // Append SVG to the container
        const svg = d3.select(familyTreeContainer).append("svg")
            .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Create the D3 tree layout with increased spacing
        const treeLayout = d3.tree()
            .nodeSize([150, 150]); // Use nodeSize to control horizontal and vertical spacing

        // Filter out non-hierarchical relationships (spouses) for the main tree
        const hierarchicalMembers = familyMembers.filter(m => m.relationship !== "spouse");

        let root;
        if (hierarchicalMembers.length > 0) {
            root = d3.stratify()
                .id(d => d.id)
                .parentId(d => d.relatedTo === "0" ? null : d.relatedTo)
                (hierarchicalMembers);

            treeLayout(root);

            // Draw hierarchical links (parent-child connections)
            svg.selectAll(".link")
                .data(root.links())
                .enter().append("path")
                .attr("class", "link")
                .attr("d", d3.linkVertical()
                    .x(d => d.x)
                    .y(d => d.y));

            // Draw a horizontal line to connect siblings, using the new `sibling-line` class
            const siblingGroups = d3.group(root.descendants(), d => d.parent ? d.parent.id : null);
            siblingGroups.forEach((children, parentId) => {
                if (children.length > 1) {
                    const firstChild = children[0];
                    const lastChild = children[children.length - 1];
                    const midpointY = firstChild.y - 75; // Position the horizontal line above children

                    svg.append("line")
                        .attr("class", "sibling-line")
                        .attr("x1", firstChild.x)
                        .attr("y1", midpointY)
                        .attr("x2", lastChild.x)
                        .attr("y2", midpointY);
                }
            });

            // Add hierarchical nodes (circles and text)
            const nodes = svg.selectAll(".node")
                .data(root.descendants())
                .enter().append("g")
                .attr("class", "node")
                .attr("transform", d => `translate(${d.x},${d.y})`);

            const nodeText = nodes.append("text")
                .text(d => d.data.name);

            nodes.insert("circle", "text")
                .attr("r", function(d) {
                    const bbox = this.parentNode.querySelector("text").getBBox();
                    return Math.max(bbox.width, bbox.height) / 2 + 10;
                });

            // Draw spouse links and nodes separately
            const spouseLinks = familyMembers.filter(m => m.relationship === "spouse");
            const allNodes = root.descendants();

            spouseLinks.forEach(spouse => {
                const partner = allNodes.find(d => d.data.id == spouse.relatedTo);

                if (partner) {
                    const spouseX = partner.x + 150;
                    const spouseY = partner.y;

                    svg.append("line")
                        .attr("class", "spouse-link")
                        .attr("x1", partner.x)
                        .attr("y1", partner.y)
                        .attr("x2", spouseX)
                        .attr("y2", spouseY);

                    const spouseNode = svg.append("g")
                        .attr("class", "node")
                        .attr("transform", `translate(${spouseX},${spouseY})`);

                    const spouseText = spouseNode.append("text")
                        .text(spouse.name);

                    spouseNode.insert("circle", "text")
                        .attr("r", function() {
                            const bbox = this.parentNode.querySelector("text").getBBox();
                            return Math.max(bbox.width, bbox.height) / 2 + 10;
                        });
                }
            });
        } else {
            const rootMember = familyMembers.find(m => m.relatedTo === "0");
            if (rootMember) {
                const nodes = svg.append("g")
                    .attr("class", "node")
                    .attr("transform", `translate(${width / 2}, ${height / 2})`);

                const rootText = nodes.append("text")
                    .text(rootMember.name);

                nodes.insert("circle", "text")
                    .attr("r", function() {
                        const bbox = this.parentNode.querySelector("text").getBBox();
                        return Math.max(bbox.width, bbox.height) / 2 + 10;
                    });
            }
        }
    }

    addMemberForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const memberName = memberNameInput.value;
        const relatedTo = relatedToSelect.value;
        const relationship = relationshipSelect.value;

        if (familyMembers.length === 0 && relatedTo !== "0") {
            showMessage("The first member of the tree must be the root (Related to: This is the Root of the tree).");
            return;
        }

        const newMember = {
            id: nextId++,
            name: memberName,
            relatedTo: relatedTo,
            relationship: relationship
        };

        familyMembers.push(newMember);
        updateRelatedToDropdown();
        drawTree();
        addMemberForm.reset();
    });

    function downloadImage(downloadButton) {
        const treeContainer = document.getElementById('family-tree-container');
        if (!treeContainer || !treeContainer.querySelector('svg')) {
            showMessage("There is no family tree to download yet. Please add some members first.");
            return;
        }

        html2canvas(treeContainer).then(canvas => {
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = 'family-tree.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }).catch(error => {
            console.error("Error during image download:", error);
            showMessage("An error occurred while trying to download the image.");
        });
    }

    downloadImgBtnPage.addEventListener('click', () => downloadImage(downloadImgBtnPage));
    
    updateRelatedToDropdown();
    drawTree();
});

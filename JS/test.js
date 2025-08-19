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
        modalMessage.textContent = '❗ ' + message; // Add an exclamation emoji for clarity
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

    const addMemberForm = document.getElementById('add-member-form');
    const memberNameInput = document.getElementById('member-name');
    const parent1Select = document.getElementById('parent1-select');
    const parent2Select = document.getElementById('parent2-select');
    const spouseSelect = document.getElementById('spouse-select');
    const deleteMemberSelect = document.getElementById('delete-member-select');
    const treeContainer = document.getElementById('tree-container');
    const downloadImgBtnPage = document.getElementById('download-img-btn-page');
    const downloadImgBtnNav = document.getElementById('download-img-btn-nav');
    const searchInput = document.getElementById('search-input');
    const searchResultsList = document.getElementById('search-results');

    // Define the color palette with a vibrant green for links
    const colors = {
        nodeFill: "#E0F2FE", // A light blue
        nodeStroke: "#0284C7", // A deep blue for node borders
        linkStroke: "#22C55E", // A vibrant, clear green for lines
        spouseLinkStroke: "#F472B6", // A soft pink for spouse lines
        textFill: "#1F2937", // A dark gray for text
        highlightFill: "#FDE047", // A bright yellow for search highlight
        highlightStroke: "#FACC15", // A darker yellow for highlight border
        spouseNodeFill: "#1da34a",
        spouseNodeStroke: "#3f0"
    };

    // --- Search Functionality ---
    function performSearch() {
        const query = searchInput.value.toLowerCase();
        searchResultsList.innerHTML = '';
        if (query.length < 2) return;

        const results = familyMembers.filter(member => member.name.toLowerCase().includes(query));

        if (results.length > 0) {
            results.forEach(member => {
                const li = document.createElement('li');
                li.textContent = member.name;
                li.addEventListener('click', () => {
                    highlightMember(member.id);
                });
                searchResultsList.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.textContent = 'No results found.';
            searchResultsList.appendChild(li);
        }
    }

    // Debounce the search input to prevent excessive function calls
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(performSearch, 300);
    });

    function highlightMember(memberId) {
        // Clear previous highlights
        d3.select(treeContainer).selectAll(".highlight").classed("highlight", false);

        // Highlight the selected member's node
        const node = d3.select(`#node-${memberId}`).select("circle");
        if (node.node()) {
            // Use D3 transitions to smoothly change the color
            node.transition()
                .duration(500)
                .attr("fill", colors.highlightFill)
                .attr("stroke", colors.highlightStroke);

            // Revert color after a delay
            setTimeout(() => {
                const member = familyMembers.find(m => m.id === memberId);
                const isSpouse = member && member.spouse !== null;
                node.transition()
                    .duration(500)
                    .attr("fill", isSpouse ? colors.spouseNodeFill : colors.nodeFill)
                    .attr("stroke", isSpouse ? colors.spouseNodeStroke : colors.nodeStroke);
            }, 2000);
        }

        // Clear search results
        searchResultsList.innerHTML = '';
        searchInput.value = '';
    }

    // --- Family Tree Logic ---
    function addMember(name, gender, parent1Id, parent2Id, spouseId) {
        // Check for duplicate names
        if (familyMembers.some(member => member.name.toLowerCase() === name.toLowerCase())) {
            showMessage("A member with this name already exists. Please use a unique name.");
            return;
        }

        const newMember = {
            id: nextId++,
            name,
            gender,
            parents: [],
            spouse: null
        };

        if (parent1Id) newMember.parents.push(parseInt(parent1Id));
        if (parent2Id) newMember.parents.push(parseInt(parent2Id));
        if (spouseId) newMember.spouse = parseInt(spouseId);

        familyMembers.push(newMember);

        // Log the updated array to prove it's being stored
        console.log("Updated familyMembers array:", familyMembers);

        updateFamilyStructure();
        updateDropdowns();
        drawTree();
        showMessage(`${name} has been added to the family tree.`);
    }

    function deleteMember(memberId) {
        memberId = parseInt(memberId);
        if (memberId === 0) {
            showMessage("Please select a member to delete.");
            return;
        }

        const memberToDelete = familyMembers.find(m => m.id === memberId);
        if (!memberToDelete) return;

        // Remove the member and any related spouse links
        familyMembers = familyMembers.filter(m => m.id !== memberId && m.spouse !== memberId);

        // Remove the member as a parent or spouse from others
        familyMembers.forEach(member => {
            member.parents = member.parents.filter(pId => pId !== memberId);
            if (member.spouse === memberId) {
                member.spouse = null;
            }
        });

        console.log("Family member deleted. Updated array:", familyMembers);
        updateFamilyStructure();
        updateDropdowns();
        drawTree();
        showMessage(`${memberToDelete.name} has been deleted.`);
    }

    function updateFamilyStructure() {
        // Find and link spouses
        familyMembers.forEach(member => {
            if (member.spouse) {
                const spouse = familyMembers.find(s => s.id === member.spouse);
                if (spouse && spouse.spouse === null) {
                    spouse.spouse = member.id;
                }
            }
        });
    }

    // --- D3.js Visualization ---
    /**
     * @description Builds a D3-compatible hierarchical data structure from the flat familyMembers array,
     * assuming a single family tree.
     * @returns {object} The root node of the hierarchical tree, or null if no root exists.
     */
    function buildTreeData() {
        if (familyMembers.length === 0) {
            return null;
        }

        const memberMap = new Map();
        familyMembers.forEach(member => {
            memberMap.set(member.id, { ...member, children: [] });
        });

        let rootNode = null;
        let allNodes = Array.from(memberMap.values());

        // The core fix: find the single root and build the hierarchy from there.
        rootNode = allNodes.find(member => member.parents.length === 0);

        if (!rootNode) {
            // No root found. This case should not happen if the first member has no parents.
            // If it does, we can't draw the tree.
            return null;
        }

        // Build the hierarchy by adding children to their parents
        allNodes.forEach(member => {
            if (member.parents.length > 0) {
                const parent = memberMap.get(member.parents[0]);
                if (parent) {
                    parent.children.push(member);
                }
            }
        });

        return rootNode;
    }

    /**
     * @description Draws or redraws the entire family tree using D3.js.
     */
    function drawTree() {
        // Clear the existing tree
        d3.select(treeContainer).select("svg").remove();

        const treeData = buildTreeData();
        if (!treeData) {
            treeContainer.innerHTML = '<div class="text-center text-gray-500">Add a family member to start building your family tree.</div>';
            return;
        }

        const margin = {
            top: 50,
            right: 150,
            bottom: 50,
            left: 150
        };
        const width = treeContainer.offsetWidth - margin.left - margin.right;
        const height = Math.max(treeContainer.offsetHeight, familyMembers.length * 100) - margin.top - margin.bottom;

        // Set up the SVG
        const svg = d3.select(treeContainer).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // D3 tree layout configuration
        const treeLayout = d3.tree().nodeSize([100, 150]); // Use fixed node sizes for a more consistent layout

        const root = d3.hierarchy(treeData, d => d.children);

        // Generate the tree layout
        treeLayout(root);

        // Draw the links (lines)
        svg.selectAll(".link")
            .data(root.links())
            .enter().append("path")
            .attr("d", d3.linkHorizontal()
                .x(d => d.y)
                .y(d => d.x)
            )
            .attr("fill", "none")
            .attr("stroke", colors.linkStroke)
            .attr("stroke-width", 2);

        // Draw the nodes
        const nodes = svg.selectAll(".node")
            .data(root.descendants())
            .enter().append("g")
            .attr("class", "node")
            .attr("transform", d => `translate(${d.y},${d.x})`)
            .attr("id", d => `node-${d.data.id}`);

        // Add circles for each person
        nodes.append("circle")
            .attr("r", 20)
            .attr("fill", d => d.data.spouse ? colors.spouseNodeFill : colors.nodeFill)
            .attr("stroke", d => d.data.spouse ? colors.spouseNodeStroke : colors.nodeStroke)
            .attr("stroke-width", 2);

        // Add text labels
        nodes.append("text")
            .attr("dy", "0.31em")
            .attr("x", 25)
            .attr("text-anchor", "start")
            .attr("fill", colors.textFill)
            .text(d => d.data.name);

        // Handle spouses by creating spouse-specific links and a separate node
        familyMembers.forEach(member => {
            if (member.spouse) {
                const memberNode = nodes.filter(d => d.data.id === member.id).data()[0];
                const spouse = familyMembers.find(s => s.id === member.spouse);

                if (memberNode && spouse) {
                    // Draw the dashed line between the member and their spouse
                    const spouseGroup = svg.append('g')
                        .attr('class', 'spouse-node')
                        .attr('transform', `translate(${memberNode.y + 100},${memberNode.x})`);

                    spouseGroup.append('circle')
                        .attr('r', 20)
                        .style('fill', colors.spouseNodeFill)
                        .style('stroke', colors.spouseNodeStroke);

                    spouseGroup.append('text')
                        .attr('dy', '0.31em')
                        .attr('x', 25)
                        .attr('text-anchor', 'start')
                        .attr('fill', colors.textFill)
                        .text(spouse.name);

                    svg.append("path")
                        .attr("d", `M${memberNode.y},${memberNode.x}L${memberNode.y + 100},${memberNode.x}`)
                        .attr("fill", "none")
                        .attr("stroke", colors.spouseLinkStroke)
                        .attr("stroke-width", 2)
                        .attr("stroke-dasharray", "5,5");
                }
            }
        });
    }

    // --- Form Event Listeners ---
    addMemberForm.addEventListener('submit', (event) => {
        event.preventDefault();
        // Correctly use the memberNameInput variable to get the value
        const name = memberNameInput.value;
        const gender = document.getElementById('gender').value;
        const parent1Id = parent1Select.value;
        const parent2Id = parent2Select.value;
        const spouseId = spouseSelect.value;

        if (name.trim() === '') {
            showMessage("Please enter a name for the family member.");
            return;
        }

        addMember(name, gender, parent1Id, parent2Id, spouseId);
        addMemberForm.reset();
    });

    const deleteMemberForm = document.getElementById('delete-member-form');
    deleteMemberForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const memberId = deleteMemberSelect.value;
        deleteMember(memberId);
        deleteMemberForm.reset();
    });

    // --- Image Download Functionality ---
    /**
     * @description Captures the SVG tree and downloads it as a PNG image.
     */
    function downloadImage() {
        const svgElement = treeContainer.querySelector('svg');
        if (!svgElement) {
            showMessage("No family tree to download. Please create a tree first.");
            return;
        }

        const tempContainer = document.createElement('div');
        tempContainer.style.width = svgElement.scrollWidth + 'px';
        tempContainer.style.height = svgElement.scrollHeight + 'px';
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

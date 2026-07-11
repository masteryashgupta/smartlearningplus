#include <stdio.h>
#include <stdlib.h>
#include <time.h>

struct Edge
{
    int u, v, weight;
};

int parent[100];

// Find function with path compression
int find(int i)
{
    if(parent[i] == i)
        return i;
    return parent[i] = find(parent[i]);
}

// Union function
void unionSet(int a, int b)
{
    int rootA = find(a);
    int rootB = find(b);
    if(rootA != rootB)
        parent[rootA] = rootB;
}

// Function to sort edges by weight (ascending)
void sortEdges(struct Edge edges[], int e)
{
    int i, j;
    struct Edge temp;
    for(i = 0; i < e - 1; i++)
    {
        for(j = 0; j < e - i - 1; j++)
        {
            if(edges[j].weight > edges[j + 1].weight)
            {
                temp = edges[j];
                edges[j] = edges[j + 1];
                edges[j + 1] = temp;
            }
        }
    }
}

int main()
{
    int n, e, i;
    clock_t start, end;
    double cpu_time_used;

    printf("Enter number of vertices: ");
    scanf("%d", &n);
    printf("Enter number of edges: ");
    scanf("%d", &e);

    struct Edge edges[e];

    printf("Enter edges (u v weight):\n");
    for(i = 0; i < e; i++)
    {
        printf("Edge %d: ", i + 1);
        scanf("%d %d %d", &edges[i].u, &edges[i].v, &edges[i].weight);
    }

    // Initialize parent array (Union-Find)
    for(i = 0; i < n; i++)
        parent[i] = i;

    // Start timing
    start = clock();

    // Sort edges by weight (Greedy choice)
    sortEdges(edges, e);

    int mstEdgeCount = 0;
    int totalCost = 0;

    printf("\nEdges in Minimum Cost Spanning Tree (Kruskal's Algorithm):\n");
    for(i = 0; i < e && mstEdgeCount < n - 1; i++)
    {
        int rootU = find(edges[i].u);
        int rootV = find(edges[i].v);

        if(rootU != rootV)
        {
            printf("Edge %d: (%d -> %d) cost = %d\n", mstEdgeCount + 1, edges[i].u, edges[i].v, edges[i].weight);
            totalCost += edges[i].weight;
            unionSet(rootU, rootV);
            mstEdgeCount++;
        }
    }

    // End timing
    end = clock();
    cpu_time_used = ((double)(end - start)) / CLOCKS_PER_SEC;

    printf("\nMinimum Cost of Spanning Tree = %d\n", totalCost);
    printf("\nTime Required = %f seconds\n", cpu_time_used);
    return 0;
}

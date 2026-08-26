#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#define INF 9999

int main()
{
    int n, i, j;
    clock_t start, end;
    double cpu_time_used;

    printf("Enter number of vertices: ");
    scanf("%d", &n);

    int cost[n][n];

    printf("Enter the adjacency/cost matrix (enter %d for no edge):\n", INF);
    for(i = 0; i < n; i++)
    {
        for(j = 0; j < n; j++)
        {
            printf("cost[%d][%d]: ", i, j);
            scanf("%d", &cost[i][j]);
        }
    }

    int visited[n];
    for(i = 0; i < n; i++)
        visited[i] = 0;

    int edgeCount = 0;
    int totalCost = 0;
    visited[0] = 1;

    // Start timing
    start = clock();

    printf("\nEdges in Minimum Cost Spanning Tree (Prim's Algorithm):\n");
    while(edgeCount < n - 1)
    {
        int min = INF, a = -1, b = -1;
        for(i = 0; i < n; i++)
        {
            if(visited[i])
            {
                for(j = 0; j < n; j++)
                {
                    if(!visited[j] && cost[i][j] != 0 && cost[i][j] < min)
                    {
                        min = cost[i][j];
                        a = i;
                        b = j;
                    }
                }
            }
        }
        if(a != -1 && b != -1)
        {
            printf("Edge %d: (%d -> %d) cost = %d\n", edgeCount + 1, a, b, min);
            totalCost += min;
            visited[b] = 1;
            edgeCount++;
        }
    }

    // End timing
    end = clock();
    cpu_time_used = ((double)(end - start)) / CLOCKS_PER_SEC;

    printf("\nMinimum Cost of Spanning Tree = %d\n", totalCost);
    printf("\nTime Required = %f seconds\n", cpu_time_used);
    return 0;
}

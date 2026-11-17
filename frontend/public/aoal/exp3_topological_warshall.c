#include <stdio.h>

#define MAX 50

int n;
int adj[MAX][MAX];

void topologicalSort(void) {
    int indeg[MAX] = {0};
    int queue[MAX], front = 0, rear = 0;
    int order[MAX], cnt = 0;

    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++)
            if (adj[i][j]) indeg[j]++;

    for (int i = 0; i < n; i++)
        if (indeg[i] == 0) queue[rear++] = i;

    while (front < rear) {
        int u = queue[front++];
        order[cnt++] = u;
        for (int v = 0; v < n; v++) {
            if (adj[u][v] && --indeg[v] == 0)
                queue[rear++] = v;
        }
    }

    if (cnt != n) {
        printf("\nThe graph contains a cycle. Topological ordering is not possible.\n");
        return;
    }
    printf("\nTopological ordering: ");
    for (int i = 0; i < n; i++)
        printf("%d%s", order[i], i < n - 1 ? " -> " : "\n");
}

void warshall(void) {
    int R[MAX][MAX];
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++)
            R[i][j] = adj[i][j];

    for (int k = 0; k < n; k++)
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++)
                R[i][j] = R[i][j] || (R[i][k] && R[k][j]);

    printf("\nTransitive closure matrix:\n");
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++)
            printf("%d ", R[i][j]);
        printf("\n");
    }
}

int main(void) {
    printf("Experiment 3: Topological Ordering and Warshall's Transitive Closure\n");
    printf("Enter number of vertices (max %d): ", MAX);
    if (scanf("%d", &n) != 1 || n <= 0 || n > MAX) {
        printf("Invalid number of vertices.\n");
        return 1;
    }

    printf("Enter the %d x %d adjacency matrix (1 = edge, 0 = no edge):\n", n, n);
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++)
            if (scanf("%d", &adj[i][j]) != 1) {
                printf("Invalid input.\n");
                return 1;
            }

    topologicalSort();
    warshall();
    return 0;
}

#include <stdio.h>

#define MAX 50

int n;
int adj[MAX][MAX];
int visited[MAX];

int readGraph(void) {
    printf("Enter number of vertices (max %d): ", MAX);
    if (scanf("%d", &n) != 1 || n <= 0 || n > MAX) {
        printf("Invalid number of vertices.\n");
        return 0;
    }
    printf("Enter the %d x %d adjacency matrix (1 = edge, 0 = no edge):\n", n, n);
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++)
            if (scanf("%d", &adj[i][j]) != 1) {
                printf("Invalid input.\n");
                return 0;
            }
    return 1;
}

void bfsReachable(void) {
    int start, queue[MAX], front = 0, rear = 0;

    if (!readGraph()) return;
    printf("Enter starting node (0 to %d): ", n - 1);
    if (scanf("%d", &start) != 1 || start < 0 || start >= n) {
        printf("Invalid starting node.\n");
        return;
    }

    for (int i = 0; i < n; i++) visited[i] = 0;
    visited[start] = 1;
    queue[rear++] = start;

    printf("\nNodes reachable from %d (BFS order): ", start);
    while (front < rear) {
        int u = queue[front++];
        printf("%d ", u);
        for (int v = 0; v < n; v++) {
            if (adj[u][v] && !visited[v]) {
                visited[v] = 1;
                queue[rear++] = v;
            }
        }
    }
    printf("\n");

    int unreachable = 0;
    for (int i = 0; i < n; i++)
        if (!visited[i]) {
            if (!unreachable) printf("Nodes NOT reachable: ");
            printf("%d ", i);
            unreachable = 1;
        }
    if (unreachable) printf("\n");
}

void dfs(int u) {
    visited[u] = 1;
    for (int v = 0; v < n; v++)
        if ((adj[u][v] || adj[v][u]) && !visited[v])
            dfs(v);
}

void dfsConnected(void) {
    if (!readGraph()) return;

    for (int i = 0; i < n; i++) visited[i] = 0;
    dfs(0);

    int connected = 1;
    for (int i = 0; i < n; i++)
        if (!visited[i]) {
            connected = 0;
            break;
        }

    if (connected)
        printf("\nThe graph is CONNECTED.\n");
    else
        printf("\nThe graph is NOT connected.\n");
}

int main(void) {
    int choice;
    printf("Experiment 7: BFS and DFS\n");
    printf("1. Print all nodes reachable from a start node in a digraph (BFS)\n");
    printf("2. Check whether a graph is connected (DFS)\n");
    printf("Enter your choice: ");
    if (scanf("%d", &choice) != 1) {
        printf("Invalid choice.\n");
        return 1;
    }

    switch (choice) {
        case 1: bfsReachable(); break;
        case 2: dfsConnected(); break;
        default: printf("Invalid choice.\n");
    }
    return 0;
}

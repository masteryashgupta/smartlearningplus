#include <stdio.h>

#define MAX 50
#define INF 1000000000

int n;
int w[MAX][MAX];

void printPath(int parent[], int v) {
    if (parent[v] == -1) {
        printf("%d", v);
        return;
    }
    printPath(parent, parent[v]);
    printf(" -> %d", v);
}

void dijkstra(int src) {
    int dist[MAX], visited[MAX] = {0}, parent[MAX];

    for (int i = 0; i < n; i++) {
        dist[i] = INF;
        parent[i] = -1;
    }
    dist[src] = 0;

    for (int count = 0; count < n; count++) {
        int u = -1, min = INF;
        for (int i = 0; i < n; i++)
            if (!visited[i] && dist[i] < min) {
                min = dist[i];
                u = i;
            }
        if (u == -1) break;
        visited[u] = 1;

        for (int v = 0; v < n; v++) {
            if (w[u][v] > 0 && !visited[v] && dist[u] + w[u][v] < dist[v]) {
                dist[v] = dist[u] + w[u][v];
                parent[v] = u;
            }
        }
    }

    printf("\nShortest paths from vertex %d:\n", src);
    printf("%-8s %-10s %s\n", "Vertex", "Distance", "Path");
    for (int i = 0; i < n; i++) {
        printf("%-8d ", i);
        if (dist[i] == INF) {
            printf("%-10s %s\n", "INF", "No path");
        } else {
            printf("%-10d ", dist[i]);
            printPath(parent, i);
            printf("\n");
        }
    }
}

int main(void) {
    int src;
    printf("Experiment 5: Dijkstra's Shortest Path Algorithm\n");
    printf("Enter number of vertices (max %d): ", MAX);
    if (scanf("%d", &n) != 1 || n <= 0 || n > MAX) {
        printf("Invalid number of vertices.\n");
        return 1;
    }

    printf("Enter the %d x %d weight matrix (0 = no edge):\n", n, n);
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++)
            if (scanf("%d", &w[i][j]) != 1 || w[i][j] < 0) {
                printf("Invalid input (weights must be non-negative).\n");
                return 1;
            }

    printf("Enter source vertex (0 to %d): ", n - 1);
    if (scanf("%d", &src) != 1 || src < 0 || src >= n) {
        printf("Invalid source vertex.\n");
        return 1;
    }

    dijkstra(src);
    return 0;
}

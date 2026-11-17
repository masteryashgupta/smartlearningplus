#define __USE_MINGW_ANSI_STDIO 1
#include <stdio.h>
#include <stdlib.h>

#define MAX 20
#define PRINT_LIMIT 10

int n;
int col[MAX];
long long solutions = 0;

int isSafe(int row, int c) {
    for (int r = 0; r < row; r++) {
        if (col[r] == c || abs(col[r] - c) == row - r)
            return 0;
    }
    return 1;
}

void printBoard(void) {
    printf("\nSolution %lld:\n", solutions);
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++)
            printf("%c ", col[i] == j ? 'Q' : '.');
        printf("\n");
    }
}

void solve(int row) {
    if (row == n) {
        solutions++;
        if (solutions <= PRINT_LIMIT) printBoard();
        return;
    }
    for (int c = 0; c < n; c++) {
        if (isSafe(row, c)) {
            col[row] = c;
            solve(row + 1);
            col[row] = -1;
        }
    }
}

int main(void) {
    printf("Experiment 10: N-Queens Problem using Backtracking\n");
    printf("Enter the number of queens N (1 to %d): ", MAX);
    if (scanf("%d", &n) != 1 || n < 1 || n > MAX) {
        printf("Invalid value of N.\n");
        return 1;
    }

    for (int i = 0; i < MAX; i++) col[i] = -1;
    solve(0);

    if (solutions == 0)
        printf("\nNo solution exists for N = %d.\n", n);
    else {
        if (solutions > PRINT_LIMIT)
            printf("\n(Only the first %d solutions are displayed.)\n", PRINT_LIMIT);
        printf("\nTotal number of solutions for N = %d: %lld\n", n, solutions);
    }
    return 0;
}

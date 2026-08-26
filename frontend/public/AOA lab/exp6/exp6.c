#include <stdio.h>
#include <stdlib.h>
#include <time.h>

int main()
{
    int A[2][2], B[2][2], C[2][2];
    int M1, M2, M3, M4, M5, M6, M7;
    int i, j;
    clock_t start, end;
    double cpu_time_used;

    printf("Enter elements of 2x2 Matrix A:\n");
    for(i = 0; i < 2; i++)
        for(j = 0; j < 2; j++)
            scanf("%d", &A[i][j]);

    printf("Enter elements of 2x2 Matrix B:\n");
    for(i = 0; i < 2; i++)
        for(j = 0; j < 2; j++)
            scanf("%d", &B[i][j]);

    // Start timing
    start = clock();

    // Strassen's 7 multiplications
    M1 = (A[0][0] + A[1][1]) * (B[0][0] + B[1][1]);
    M2 = (A[1][0] + A[1][1]) * B[0][0];
    M3 = A[0][0] * (B[0][1] - B[1][1]);
    M4 = A[1][1] * (B[1][0] - B[0][0]);
    M5 = (A[0][0] + A[0][1]) * B[1][1];
    M6 = (A[1][0] - A[0][0]) * (B[0][0] + B[0][1]);
    M7 = (A[0][1] - A[1][1]) * (B[1][0] + B[1][1]);

    // Result matrix using M1..M7
    C[0][0] = M1 + M4 - M5 + M7;
    C[0][1] = M3 + M5;
    C[1][0] = M2 + M4;
    C[1][1] = M1 - M2 + M3 + M6;

    // End timing
    end = clock();
    cpu_time_used = ((double)(end - start)) / CLOCKS_PER_SEC;

    printf("\nMatrix A:\n");
    for(i = 0; i < 2; i++)
    {
        for(j = 0; j < 2; j++)
            printf("%d ", A[i][j]);
        printf("\n");
    }

    printf("\nMatrix B:\n");
    for(i = 0; i < 2; i++)
    {
        for(j = 0; j < 2; j++)
            printf("%d ", B[i][j]);
        printf("\n");
    }

    printf("\nResultant Matrix C (A x B) using Strassen's Method:\n");
    for(i = 0; i < 2; i++)
    {
        for(j = 0; j < 2; j++)
            printf("%d ", C[i][j]);
        printf("\n");
    }

    printf("\nTime Required = %f seconds\n", cpu_time_used);
    return 0;
}

#include <stdio.h>

int main() {
    int test1;
    int test2;
    int exam;
    
    printf("Enter test1:");
    scanf("%d",&test1);
    
    printf("Enter test2:");
    scanf("%d",&test2);
    
    printf("Enter exam:");
    scanf("%d",&exam);
    
    int Totalmark = test1 + test2 + exam;
    printf("Totalmark:%d\n",Totalmark);
    
    float Average = Totalmark / 3.0;
    printf("Average:%.2f\n",Average);
    
    return 0;
}